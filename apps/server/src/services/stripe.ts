import Stripe from "stripe";
import { config } from "../config.js";
import { db } from "../db/client.js";
import { logger } from "../logger.js";

// NEW (not in the reference repo). Checkout + customer portal + webhook that
// flips a workspace between free and pro.

let cached: Stripe | null = null;
function stripe(): Stripe {
  if (!cached) cached = new Stripe(config.stripeSecretKey);
  return cached;
}

interface CompanyBilling {
  id: string;
  name: string;
  stripe_customer_id: string | null;
}

async function getCompany(companyId: string): Promise<CompanyBilling> {
  const { data, error } = await db()
    .from("companies")
    .select("id, name, stripe_customer_id")
    .eq("id", companyId)
    .single();
  if (error || !data) throw new Error("Company not found");
  return data as CompanyBilling;
}

/** Ensure the company has a Stripe customer; create one on first use. */
async function ensureCustomer(company: CompanyBilling, email: string): Promise<string> {
  if (company.stripe_customer_id) return company.stripe_customer_id;
  const customer = await stripe().customers.create({
    email,
    name: company.name,
    metadata: { company_id: company.id },
  });
  await db().from("companies").update({ stripe_customer_id: customer.id }).eq("id", company.id);
  return customer.id;
}

/** Create a Checkout Session for the Pro plan. Returns the redirect URL. */
export async function createCheckoutSession(companyId: string, email: string): Promise<string> {
  const company = await getCompany(companyId);
  const customer = await ensureCustomer(company, email);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: config.stripePriceProMonthly, quantity: 1 }],
    success_url: `${config.webAppUrl.replace(/\/$/, "")}/billing?status=success`,
    cancel_url: `${config.webAppUrl.replace(/\/$/, "")}/billing?status=cancelled`,
    metadata: { company_id: companyId },
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/** Create a Billing Portal session. Returns the redirect URL. */
export async function createPortalSession(companyId: string): Promise<string> {
  const company = await getCompany(companyId);
  if (!company.stripe_customer_id) throw new Error("No Stripe customer for this workspace yet");
  const session = await stripe().billingPortal.sessions.create({
    customer: company.stripe_customer_id,
    return_url: `${config.webAppUrl.replace(/\/$/, "")}/billing`,
  });
  return session.url;
}

/** Verify and process a Stripe webhook. `rawBody` must be the unparsed body. */
export async function handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
  const event = stripe().webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const companyId = session.metadata?.company_id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (companyId) {
        await db()
          .from("companies")
          .update({ plan: "pro", ...(customerId ? { stripe_customer_id: customerId } : {}) })
          .eq("id", companyId);
        logger.info({ companyId }, "stripe: upgraded to pro");
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      await db().from("companies").update({ plan: "free" }).eq("stripe_customer_id", customerId);
      logger.info({ customerId }, "stripe: downgraded to free");
      break;
    }
    default:
      logger.debug({ type: event.type }, "stripe: unhandled event");
  }
}
