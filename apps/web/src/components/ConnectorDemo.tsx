import { useEffect, useRef, useState } from "react";

// ConnectorDemo's natural, unscaled size (three fixed-width sidebar columns,
// the caption line, and the pause/restart control row below).
const NATURAL_WIDTH = 604;
const NATURAL_HEIGHT = 716;

// Looping animated demo of adding the Commonality custom MCP connector in
// Claude, ending with it using the connector to find a warm intro. This
// depicts Claude's own UI chrome (though captions stay AI-agnostic) - see
// the scoped .connector-demo CSS variables in index.css for its palette, and
// the Tabler Icons webfont link in index.html for its icons.
const DEMO_HTML = `
<h2 class="sr-only">Looping animated demo of adding a custom MCP connector in your AI assistant, ending with it typing out a warm-intro answer using the connected tool</h2>

<div data-el="stage" style="position:relative; display:flex; background:var(--surface-2); border-radius:12px; border:0.5px solid var(--border); overflow:hidden; font-size:13px; min-height:640px;">

  <div style="width:64px; border-right:0.5px solid var(--border); padding:16px 0; display:flex; flex-direction:column; align-items:center; gap:20px; color:var(--text-muted);">
    <i class="ti ti-plus" aria-hidden="true" style="font-size:18px;"></i>
    <div data-el="chats-icon" style="width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; transition:background 0.15s, transform 0.15s;">
      <i class="ti ti-message-circle" aria-hidden="true" style="font-size:18px;"></i>
    </div>
    <i class="ti ti-layout-grid" aria-hidden="true" style="font-size:18px;"></i>
    <i class="ti ti-books" aria-hidden="true" style="font-size:18px;"></i>
    <div data-el="briefcase-icon" style="width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; transition:background 0.15s, transform 0.15s;">
      <i class="ti ti-briefcase" aria-hidden="true" style="font-size:18px; color:var(--text-accent);"></i>
    </div>
  </div>

  <div style="width:220px; border-right:0.5px solid var(--border); padding:16px; align-self:flex-start;">
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:16px; color:var(--text-secondary);">
      <i class="ti ti-arrow-left" aria-hidden="true" style="font-size:16px;"></i>
      <span style="font-weight:500; font-size:14px; color:var(--text-primary);">Customize</span>
    </div>
    <div style="display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:var(--radius); color:var(--text-secondary);">
      <i class="ti ti-bulb" aria-hidden="true" style="font-size:16px;"></i>Skills
    </div>
    <div data-el="nav-connectors" style="display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:var(--radius); color:var(--text-secondary); transition:background 0.2s, color 0.2s, transform 0.15s;">
      <i class="ti ti-plug" aria-hidden="true" style="font-size:16px;"></i>Connectors
    </div>
    <div style="margin-top:20px; font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.02em; padding:0 10px;">Personal plugins</div>
    <div style="display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:var(--radius); color:var(--text-secondary); margin-top:6px;">
      <i class="ti ti-file-text" aria-hidden="true" style="font-size:16px;"></i>PDF viewer
    </div>
  </div>

  <div style="width:320px; padding:16px; position:relative; align-self:flex-start;">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
      <span style="font-weight:500; font-size:15px;">Connectors</span>
      <div style="display:flex; gap:8px; align-items:center;">
        <i class="ti ti-search" aria-hidden="true" style="font-size:16px; color:var(--text-secondary);"></i>
        <div data-el="plus-btn" style="width:22px; height:22px; border-radius:6px; background:var(--bg-accent); display:flex; align-items:center; justify-content:center; transition:transform 0.15s;">
          <i class="ti ti-plus" aria-hidden="true" style="font-size:14px; color:var(--text-accent);"></i>
        </div>
      </div>
    </div>
    <div style="display:flex; gap:16px; font-size:13px; color:var(--text-secondary); border-bottom:0.5px solid var(--border); padding-bottom:8px; margin-bottom:12px;">
      <span style="color:var(--text-primary); font-weight:500; border-bottom:2px solid var(--text-primary); padding-bottom:8px; margin-bottom:-9px;">All</span>
      <span>Connected</span>
      <span>Not connected</span>
    </div>
    <div style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">Popular</div>
    <div style="display:flex; flex-direction:column; gap:10px;">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <span style="display:flex; align-items:center; gap:8px;"><i class="ti ti-brand-notion" aria-hidden="true" style="font-size:16px;"></i>Notion</span>
        <button style="padding:4px 10px; font-size:12px;">Connect</button>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <span style="display:flex; align-items:center; gap:8px;"><i class="ti ti-brand-office" aria-hidden="true" style="font-size:16px;"></i>Microsoft 365</span>
        <button style="padding:4px 10px; font-size:12px;">Connect</button>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <span style="display:flex; align-items:center; gap:8px;"><i class="ti ti-puzzle" aria-hidden="true" style="font-size:16px;"></i>Atlassian</span>
        <button style="padding:4px 10px; font-size:12px;">Connect</button>
      </div>
    </div>

    <div data-el="popover" style="opacity:0; pointer-events:none; transition:opacity 0.2s; position:absolute; top:40px; right:8px; width:210px; background:var(--surface-3); border:0.5px solid var(--border); border-radius:10px; box-shadow:var(--shadow-popover); padding:6px; z-index:2;">
      <div style="display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:var(--radius); font-size:13px; color:var(--text-primary);">
        <i class="ti ti-compass" aria-hidden="true" style="font-size:16px;"></i>Browse connectors
      </div>
      <div data-el="add-custom-item" style="display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:var(--radius); font-size:13px; font-weight:500; color:var(--text-accent); transition:background 0.15s, transform 0.15s;">
        <i class="ti ti-dots" aria-hidden="true" style="font-size:16px;"></i>Add custom connector
      </div>
    </div>
  </div>

  <div data-el="toast" style="position:absolute; top:14px; right:14px; background:var(--surface-3); border:0.5px solid var(--border); border-radius:10px; box-shadow:var(--shadow-popover); padding:8px 12px; display:flex; align-items:center; gap:8px; font-size:12px; opacity:0; transition:opacity 0.3s; z-index:25;">
    <i class="ti ti-info-circle" aria-hidden="true" style="font-size:14px; color:var(--text-secondary);"></i>
    Connected to Commonality.
    <i class="ti ti-x" aria-hidden="true" style="font-size:12px; color:var(--text-muted);"></i>
  </div>

  <div data-el="cursor" style="position:absolute; width:16px; height:16px; z-index:30; transition:left 0.9s ease-in-out, top 0.9s ease-in-out; left:246px; top:146px;">
    <svg viewBox="0 0 24 24" width="16" height="16" style="filter:drop-shadow(0 1px 1px rgba(0,0,0,0.3));"><path d="M4 2 L4 20 L9 15 L12 22 L15 21 L12 14 L19 14 Z" fill="var(--text-primary)"/></svg>
  </div>

  <div data-el="modal-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; opacity:0; pointer-events:none; transition:opacity 0.25s; z-index:15;">
    <div style="background:var(--surface-2); border-radius:12px; width:320px; padding:18px; box-shadow:var(--shadow-lg);">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
        <span style="font-weight:500; font-size:15px;">Add custom connector <span style="font-size:10px; color:var(--text-secondary); border:0.5px solid var(--border); border-radius:4px; padding:1px 5px; margin-left:4px;">BETA</span></span>
        <i class="ti ti-x" aria-hidden="true" style="font-size:14px; color:var(--text-muted);"></i>
      </div>
      <div style="font-size:12px; color:var(--text-secondary); line-height:1.5; margin-bottom:12px;">Connect Claude to your data and tools. <span style="color:var(--text-accent);">Learn more about connectors</span> or get started with <span style="color:var(--text-accent);">pre-built ones</span>.</div>

      <div style="border:0.5px solid var(--border); border-radius:var(--radius); padding:6px 8px; font-size:13px; margin-bottom:10px; min-height:18px;" data-el="name-field"></div>
      <div style="border:0.5px solid var(--border); border-radius:var(--radius); padding:6px 8px; font-size:11px; margin-bottom:12px; min-height:18px; word-break:break-all;" data-el="url-field"></div>

      <div style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-secondary); margin-bottom:10px;">
        <i class="ti ti-chevron-up" aria-hidden="true" style="font-size:14px;"></i>Advanced settings
      </div>
      <div style="border:0.5px solid var(--border); border-radius:var(--radius); padding:6px 8px; font-size:12px; color:var(--text-muted); margin-bottom:8px;">OAuth client ID (optional)</div>
      <div style="border:0.5px solid var(--border); border-radius:var(--radius); padding:6px 8px; font-size:12px; color:var(--text-muted); margin-bottom:14px;">OAuth client secret (optional)</div>

      <div data-el="warning-box" style="font-size:11px; color:var(--text-secondary); line-height:1.5; margin-bottom:8px; padding:8px; border-radius:var(--radius); background:var(--bg-warning); border:0.5px solid var(--border-warning); opacity:0.3; transition:opacity 0.3s;">
        <i class="ti ti-alert-triangle" aria-hidden="true" style="font-size:12px; color:var(--text-warning); vertical-align:-1px; margin-right:4px;"></i>Only use connectors from developers you trust. Anthropic does not control which tools developers make available and cannot verify that they will work as intended or that they won't change.
      </div>
      <div style="font-size:11px; color:var(--text-muted); margin-bottom:14px;">Building an MCP server? <span style="color:var(--text-accent);">Report issues and subscribe to updates here</span>.</div>

      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <span style="font-size:12px; color:var(--text-secondary); padding:5px 10px; border:0.5px solid var(--border); border-radius:var(--radius);">Cancel</span>
        <span data-el="add-btn" style="font-size:12px; padding:5px 12px; border-radius:var(--radius); background:var(--fill-primary); color:var(--on-primary); transition:transform 0.15s;">Add</span>
      </div>
    </div>
  </div>

  <div data-el="connect-screen" style="position:absolute; inset:0; background:var(--surface-1); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; opacity:0; pointer-events:none; transition:opacity 0.3s; z-index:15;">
    <div style="width:56px; height:56px; border-radius:14px; background:var(--surface-2); border:0.5px solid var(--border); display:flex; align-items:center; justify-content:center;">
      <i class="ti ti-planet" aria-hidden="true" style="font-size:26px; color:var(--text-primary);"></i>
    </div>
    <div style="font-size:12px; color:var(--text-accent); display:flex; align-items:center; gap:6px;">
      commonality-mcp-production.up.railway.app/mcp
      <i class="ti ti-copy" aria-hidden="true" style="font-size:13px; color:var(--text-muted);"></i>
    </div>
    <div style="font-size:14px; color:var(--text-secondary);">You are not connected to Commonality yet.</div>
    <span data-el="connect-btn" style="font-size:13px; font-weight:500; padding:8px 20px; border-radius:20px; background:var(--fill-primary); color:var(--on-primary); transition:transform 0.15s;">Connect</span>
  </div>

  <div data-el="oauth-screen" style="position:absolute; inset:0; background:rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; opacity:0; pointer-events:none; transition:opacity 0.3s; z-index:16;">
    <div style="background:var(--surface-2); border-radius:16px; width:300px; padding:24px 20px 0; box-shadow:var(--shadow-lg); text-align:center;">
      <div style="width:52px; height:52px; border-radius:50%; background:var(--surface-1); margin:0 auto 12px; display:flex; align-items:center; justify-content:center;">
        <i class="ti ti-shield-lock" aria-hidden="true" style="font-size:22px; color:var(--text-pro);"></i>
      </div>
      <div style="font-weight:500; font-size:16px; margin-bottom:6px;">Commonality MCP</div>
      <div style="font-size:12px; color:var(--text-secondary); line-height:1.5; margin-bottom:16px;">wants to access Commonality on behalf of<br/>you@yourcompany.com</div>

      <div style="border:0.5px solid var(--border); border-radius:var(--radius); text-align:left; margin-bottom:14px; overflow:hidden;">
        <div style="padding:8px 10px; font-size:11px; font-weight:500; background:var(--surface-1); border-bottom:0.5px solid var(--border);">This will allow Commonality MCP access to:</div>
        <div style="padding:6px 10px; font-size:11px; color:var(--text-secondary); border-bottom:0.5px solid var(--border);">&#8226; Your email address</div>
        <div style="padding:6px 10px; font-size:11px; color:var(--text-secondary);">&#8226; Your basic profile information</div>
      </div>

      <div style="font-size:10px; color:var(--text-warning); background:var(--bg-warning); border:0.5px solid var(--border-warning); border-radius:var(--radius); padding:8px; line-height:1.5; margin-bottom:14px;">
        Make sure that you trust Commonality MCP (commonality-mcp-production.up.railway.app). You may be sharing sensitive data with this site or app.
      </div>

      <div style="display:flex; gap:8px; margin-bottom:10px;">
        <span style="flex:1; font-size:12px; padding:8px; border:0.5px solid var(--border); border-radius:var(--radius); color:var(--text-secondary);">Deny</span>
        <span data-el="allow-btn" style="flex:1; font-size:12px; font-weight:500; padding:8px; border-radius:var(--radius); background:var(--fill-pro); color:var(--on-pro); transition:transform 0.15s;">Allow</span>
      </div>
      <div style="font-size:10px; color:var(--text-muted); padding-bottom:14px;">If you allow access, this app will redirect you to<br/>commonality-mcp-production.up.railway.app.</div>
      <div style="font-size:10px; color:var(--text-muted); border-top:0.5px solid var(--border); padding:8px 0; margin:0 -20px;">Secured by Clerk</div>
    </div>
  </div>

  <div data-el="chats-screen" style="position:absolute; inset:0; background:var(--surface-2); padding:24px; opacity:0; pointer-events:none; transition:opacity 0.3s; z-index:17;">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
      <span style="font-family:var(--font-voice); font-size:26px;">Chats</span>
      <div style="display:flex; gap:8px; align-items:center;">
        <span style="font-size:12px; color:var(--text-secondary); border:0.5px solid var(--border); border-radius:var(--radius); padding:6px 10px;">Filter by <b>All</b> <i class="ti ti-chevron-down" aria-hidden="true" style="font-size:11px; vertical-align:-1px;"></i></span>
        <span style="font-size:12px; border:0.5px solid var(--border); border-radius:var(--radius); padding:6px 10px;">Select chats</span>
        <span data-el="new-chat-btn" style="font-size:12px; font-weight:500; padding:7px 14px; border-radius:var(--radius); background:var(--fill-primary); color:var(--on-primary); transition:transform 0.15s;">New chat</span>
      </div>
    </div>
    <div style="border:0.5px solid var(--border); border-radius:24px; padding:10px 16px; display:flex; align-items:center; gap:8px; color:var(--text-muted); font-size:13px; margin-bottom:20px;">
      <i class="ti ti-search" aria-hidden="true" style="font-size:15px;"></i>Search chats...
    </div>
    <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:0.5px solid var(--border); font-size:13px;">
      <span>Adding Commonality's MCP URL</span>
      <span style="color:var(--text-muted); font-size:12px;">3 minutes ago</span>
    </div>
  </div>

  <div data-el="new-chat-screen" style="position:absolute; inset:0; background:var(--surface-2); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; opacity:0; pointer-events:none; transition:opacity 0.3s; z-index:18;">
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:24px;">
      <i class="ti ti-sparkles" aria-hidden="true" style="font-size:22px; color:var(--text-accent);"></i>
      <span style="font-family:var(--font-voice); font-size:28px;">Welcome</span>
    </div>
    <div style="width:100%; max-width:460px; background:var(--surface-1); border-radius:16px; padding:14px 16px;">
      <div data-el="prompt-text" style="min-height:20px; font-size:14px; color:var(--text-primary); margin-bottom:18px;"></div>
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <i class="ti ti-plus" aria-hidden="true" style="font-size:16px; color:var(--text-secondary);"></i>
        <div style="display:flex; align-items:center; gap:10px; font-size:12px; color:var(--text-secondary);">
          Sonnet 5 <i class="ti ti-chevron-down" aria-hidden="true" style="font-size:11px;"></i>
          <i class="ti ti-microphone" aria-hidden="true" style="font-size:15px;"></i>
        </div>
      </div>
    </div>
    <div style="display:flex; gap:8px; margin-top:14px; font-size:12px; color:var(--text-secondary);">
      <span style="border:0.5px solid var(--border); border-radius:20px; padding:6px 12px;"><i class="ti ti-code" aria-hidden="true" style="font-size:13px; margin-right:4px;"></i>Code</span>
      <span style="border:0.5px solid var(--border); border-radius:20px; padding:6px 12px;"><i class="ti ti-pencil" aria-hidden="true" style="font-size:13px; margin-right:4px;"></i>Write</span>
      <span style="border:0.5px solid var(--border); border-radius:20px; padding:6px 12px;">From Drive</span>
      <span style="border:0.5px solid var(--border); border-radius:20px; padding:6px 12px;">From Calendar</span>
    </div>
  </div>

  <div data-el="result-screen" style="position:absolute; inset:0; background:var(--surface-2); padding:28px; opacity:0; pointer-events:none; transition:opacity 0.3s; z-index:19; overflow:hidden;">
    <div style="background:var(--surface-1); border-radius:16px; padding:14px 18px; font-size:13px; margin-bottom:20px; max-width:420px; margin-left:auto;">
      find a warm path to <span style="color:var(--text-accent); text-decoration:underline;">https://www.linkedin.com/in/janedoe/</span>
    </div>
    <div data-el="result-body" style="font-family:var(--font-voice); font-size:14px; line-height:1.75; color:var(--text-primary);"></div>
  </div>
</div>

<div data-el="caption" style="margin-top:10px; font-size:12px; color:var(--text-secondary); min-height:16px;"></div>
`;

// Thrown to unwind the current pass through the steps early when the user
// clicks Restart, without ending the animation entirely - the outer while
// loop catches this per-iteration and just loops again (which resets all UI
// state at the top, same as a natural loop-around).
class RestartSignal extends Error {}

export function ConnectorDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paused, setPausedState] = useState(false);
  // Buttons live outside the effect (which only runs once), so control
  // functions are exposed through a ref the buttons' onClick reads from.
  const controlsRef = useRef<{ togglePause: () => void; restart: () => void } | null>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    let stopped = false;
    let isPaused = false;
    let pauseWaiters: (() => void)[] = [];
    let restartRequested = false;

    function waitForUnpause(): Promise<void> {
      return new Promise((resolve) => {
        if (!isPaused) return resolve();
        pauseWaiters.push(resolve);
      });
    }

    controlsRef.current = {
      togglePause: () => {
        isPaused = !isPaused;
        setPausedState(isPaused);
        if (!isPaused) {
          const waiters = pauseWaiters;
          pauseWaiters = [];
          waiters.forEach((w) => w());
        }
      },
      restart: () => {
        restartRequested = true;
        if (isPaused) controlsRef.current?.togglePause();
      },
    };

    const el = <T extends HTMLElement = HTMLElement>(name: string): T =>
      root.querySelector(`[data-el="${name}"]`) as T;

    const stage = el("stage");
    const chatsIcon = el("chats-icon");
    const briefcase = el("briefcase-icon");
    const navConnectors = el("nav-connectors");
    const plusBtn = el("plus-btn");
    const popover = el("popover");
    const addCustomItem = el("add-custom-item");
    const caption = el("caption");
    const modalOverlay = el("modal-overlay");
    const nameField = el("name-field");
    const urlField = el("url-field");
    const addBtn = el("add-btn");
    const warningBox = el("warning-box");
    const connectScreen = el("connect-screen");
    const connectBtn = el("connect-btn");
    const oauthScreen = el("oauth-screen");
    const allowBtn = el("allow-btn");
    const toast = el("toast");
    const chatsScreen = el("chats-screen");
    const newChatBtn = el("new-chat-btn");
    const newChatScreen = el("new-chat-screen");
    const promptText = el("prompt-text");
    const resultScreen = el("result-screen");
    const resultBody = el("result-body");
    const cursor = el("cursor");

    function centerOf(target: HTMLElement) {
      const s = stage.getBoundingClientRect();
      const r = target.getBoundingClientRect();
      // getBoundingClientRect() reflects any ambient CSS transform scale
      // applied by an ancestor (e.g. the scaled-down embed on the marketing
      // page), but cursor.style.left/top are interpreted in the stage's own
      // local (pre-transform) coordinate space, which the ancestor then
      // re-scales again when rendering. Convert back to local units by
      // dividing out the ambient scale (offsetWidth/Height never reflect a
      // transform, only the rect does), or the cursor would only travel a
      // fraction of the intended distance under any scaled embed.
      const scaleX = s.width / stage.offsetWidth;
      const scaleY = s.height / stage.offsetHeight;
      return {
        x: (r.left - s.left) / scaleX + r.width / scaleX / 2 - 8,
        y: (r.top - s.top) / scaleY + r.height / scaleY / 2 - 8,
      };
    }
    function moveCursorTo(target: HTMLElement) {
      const p = centerOf(target);
      cursor.style.left = `${p.x}px`;
      cursor.style.top = `${p.y}px`;
    }
    function click(target: HTMLElement) {
      target.style.transform = "scale(0.9)";
      setTimeout(() => {
        target.style.transform = "scale(1)";
      }, 140);
    }
    // Rejects instead of resolving once stopped, so the calling async
    // function unwinds immediately at the next await instead of continuing
    // to mutate the DOM after unmount (matters under StrictMode's dev-only
    // double effect invocation, where an old instance's pending timers can
    // otherwise race a freshly-mounted one). Also rejects (with RestartSignal)
    // once a restart is requested, and holds up progression (without losing
    // its place) while paused.
    function wait(ms: number) {
      return new Promise<void>((resolve, reject) => {
        setTimeout(async () => {
          if (stopped) return reject(new Error("stopped"));
          if (restartRequested) return reject(new RestartSignal());
          await waitForUnpause();
          if (stopped) return reject(new Error("stopped"));
          if (restartRequested) return reject(new RestartSignal());
          resolve();
        }, ms);
      });
    }
    function typeInto(target: HTMLElement, text: string, speed: number) {
      target.textContent = "";
      let i = 0;
      return new Promise<void>((resolve) => {
        function step() {
          if (stopped || restartRequested) return resolve();
          if (i < text.length) {
            target.textContent += text.charAt(i);
            i++;
            setTimeout(step, speed);
          } else {
            resolve();
          }
        }
        step();
      });
    }
    function typeLine(container: HTMLElement, text: string, speed: number, bold: boolean) {
      const div = document.createElement("div");
      div.style.marginBottom = "10px";
      if (bold) div.style.fontWeight = "500";
      container.appendChild(div);
      let i = 0;
      return new Promise<void>((resolve) => {
        function step() {
          if (stopped || restartRequested) return resolve();
          if (i < text.length) {
            div.textContent += text.charAt(i);
            i++;
            setTimeout(step, speed);
          } else {
            resolve();
          }
        }
        step();
      });
    }
    function mutedLine(container: HTMLElement, text: string) {
      const div = document.createElement("div");
      div.style.marginBottom = "10px";
      div.style.fontSize = "12px";
      div.style.color = "var(--text-muted)";
      div.textContent = text;
      container.appendChild(div);
    }

    async function playLoop() {
      while (!stopped) {
        try {
        restartRequested = false;
        caption.textContent = "";
        chatsIcon.style.background = "transparent";
        briefcase.style.background = "transparent";
        navConnectors.style.background = "transparent";
        navConnectors.style.color = "var(--text-secondary)";
        popover.style.opacity = "0";
        popover.style.pointerEvents = "none";
        addCustomItem.style.background = "transparent";
        modalOverlay.style.opacity = "0";
        modalOverlay.style.pointerEvents = "none";
        connectScreen.style.opacity = "0";
        connectScreen.style.pointerEvents = "none";
        oauthScreen.style.opacity = "0";
        oauthScreen.style.pointerEvents = "none";
        chatsScreen.style.opacity = "0";
        chatsScreen.style.pointerEvents = "none";
        newChatScreen.style.opacity = "0";
        newChatScreen.style.pointerEvents = "none";
        resultScreen.style.opacity = "0";
        resultScreen.style.pointerEvents = "none";
        resultBody.innerHTML = "";
        toast.style.opacity = "0";
        nameField.textContent = "";
        urlField.textContent = "";
        promptText.textContent = "";
        warningBox.style.opacity = "0.3";
        cursor.style.left = "246px";
        cursor.style.top = "146px";
        cursor.style.opacity = "1";
        await wait(700);

        caption.textContent = "1. Click the workspace icon";
        moveCursorTo(briefcase);
        await wait(1050);
        click(briefcase);
        briefcase.style.background = "var(--bg-accent)";
        await wait(750);

        caption.textContent = "2. Click Connectors in the sidebar";
        moveCursorTo(navConnectors);
        await wait(1050);
        click(navConnectors);
        navConnectors.style.background = "var(--bg-accent)";
        navConnectors.style.color = "var(--text-accent)";
        await wait(750);

        caption.textContent = "3. Click the plus button";
        moveCursorTo(plusBtn);
        await wait(1050);
        click(plusBtn);
        await wait(250);
        popover.style.opacity = "1";
        popover.style.pointerEvents = "auto";
        await wait(700);

        caption.textContent = '4. Choose "Add custom connector"';
        moveCursorTo(addCustomItem);
        await wait(1050);
        click(addCustomItem);
        addCustomItem.style.background = "var(--bg-accent)";
        await wait(600);
        popover.style.opacity = "0";
        popover.style.pointerEvents = "none";

        cursor.style.opacity = "0";
        modalOverlay.style.opacity = "1";
        modalOverlay.style.pointerEvents = "auto";
        await wait(500);

        caption.textContent = "5. Type a name for the connector";
        await typeInto(nameField, "Commonality", 70);
        await wait(700);

        caption.textContent = "6. Paste the remote MCP server URL";
        await typeInto(urlField, `${window.location.origin}/mcp`, 24);
        await wait(900);

        caption.textContent = "7. Advanced settings (OAuth) are optional, skip them";
        await wait(2200);

        caption.textContent = "8. Read the trust warning before adding a connector";
        warningBox.style.opacity = "1";
        await wait(3200);

        caption.textContent = "9. Click Add";
        cursor.style.opacity = "1";
        cursor.style.left = "246px";
        cursor.style.top = "146px";
        await wait(80);
        moveCursorTo(addBtn);
        await wait(1050);
        click(addBtn);
        await wait(500);

        modalOverlay.style.opacity = "0";
        modalOverlay.style.pointerEvents = "none";
        cursor.style.opacity = "0";
        connectScreen.style.opacity = "1";
        connectScreen.style.pointerEvents = "auto";
        await wait(700);

        caption.textContent = "10. Click Connect";
        cursor.style.opacity = "1";
        cursor.style.left = "246px";
        cursor.style.top = "520px";
        await wait(80);
        moveCursorTo(connectBtn);
        await wait(1050);
        click(connectBtn);
        await wait(500);

        connectScreen.style.opacity = "0";
        connectScreen.style.pointerEvents = "none";
        cursor.style.opacity = "0";
        oauthScreen.style.opacity = "1";
        oauthScreen.style.pointerEvents = "auto";
        await wait(800);

        caption.textContent = "11. Review the permissions and trust warning";
        await wait(2200);

        caption.textContent = "12. Click Allow to finish connecting";
        cursor.style.opacity = "1";
        cursor.style.left = "246px";
        cursor.style.top = "520px";
        await wait(80);
        moveCursorTo(allowBtn);
        await wait(1050);
        click(allowBtn);
        await wait(500);

        oauthScreen.style.opacity = "0";
        oauthScreen.style.pointerEvents = "none";
        cursor.style.opacity = "0";
        await wait(400);
        toast.style.opacity = "1";
        caption.textContent = "13. You're back at the connectors screen, connected";
        await wait(1600);

        caption.textContent = "14. Click the chats icon";
        cursor.style.opacity = "1";
        cursor.style.left = "246px";
        cursor.style.top = "400px";
        await wait(80);
        moveCursorTo(chatsIcon);
        await wait(1050);
        click(chatsIcon);
        chatsIcon.style.background = "var(--bg-accent)";
        await wait(500);

        toast.style.opacity = "0";
        cursor.style.opacity = "0";
        chatsScreen.style.opacity = "1";
        chatsScreen.style.pointerEvents = "auto";
        await wait(700);

        caption.textContent = "15. Click New chat";
        cursor.style.opacity = "1";
        cursor.style.left = "246px";
        cursor.style.top = "30px";
        await wait(80);
        moveCursorTo(newChatBtn);
        await wait(1050);
        click(newChatBtn);
        await wait(500);

        chatsScreen.style.opacity = "0";
        chatsScreen.style.pointerEvents = "none";
        cursor.style.opacity = "0";
        newChatScreen.style.opacity = "1";
        newChatScreen.style.pointerEvents = "auto";
        await wait(700);

        caption.textContent = "16. Ask it to use Commonality";
        await typeInto(promptText, "Find a warm path to https://www.linkedin.com/in/janedoe/", 24);
        await wait(900);

        newChatScreen.style.opacity = "0";
        newChatScreen.style.pointerEvents = "none";
        resultScreen.style.opacity = "1";
        resultScreen.style.pointerEvents = "auto";
        await wait(600);

        caption.textContent = "17. It uses Commonality to find a warm intro";
        mutedLine(resultBody, "Viewed 2 files");
        await wait(300);
        await typeLine(resultBody, "Now let me scrape the prospect's profile.", 16, false);
        await wait(400);
        mutedLine(resultBody, "Identified single educational connection with overlapping attendance years");
        await wait(300);
        await typeLine(resultBody, "Found one strong match.", 16, false);
        await wait(400);
        await typeLine(resultBody, "1. Sam K.", 22, true);
        await typeLine(resultBody, "Connection type: school (overlapping years)", 14, false);
        await typeLine(
          resultBody,
          "Detail: Both attended Wharton for their MBA, with overlapping years on campus.",
          8,
          false,
        );
        await typeLine(
          resultBody,
          "Why this matters: Direct classmate window, the strongest kind of shared-school connection.",
          10,
          false,
        );
        await wait(2600);

        caption.textContent = "Commonality found a warm intro path";
        await wait(2200);
        } catch (e) {
          // RestartSignal: loop again immediately (resets all UI state at
          // the top of the next iteration). Anything else (stopped mid-flight
          // - unmount, or a StrictMode dev double-invoke): stop for good.
          if (!(e instanceof RestartSignal)) return;
        }
      }
    }

    playLoop();
    return () => {
      stopped = true;
    };
  }, []);

  return (
    <div className="connector-demo">
      <div
        ref={containerRef}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: DEMO_HTML }}
      />
      <div className="mt-2 flex justify-center gap-2">
        <button
          type="button"
          className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-ink hover:bg-gray-50"
          onClick={() => controlsRef.current?.togglePause()}
        >
          {paused ? "Play" : "Pause"}
        </button>
        <button
          type="button"
          className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-ink hover:bg-gray-50"
          onClick={() => controlsRef.current?.restart()}
        >
          Restart
        </button>
      </div>
    </div>
  );
}

// Scales ConnectorDemo down to fit whatever width its container actually has
// (e.g. a phone screen narrower than the demo's fixed 604px layout), never
// scaling up past its natural size on wide containers. Use this instead of
// the bare component in any spot that doesn't already do its own scaling
// (Marketing.tsx's WorkflowRow scales it to match a sibling's height instead
// - don't wrap it in this too, or the two scale calculations would compound).
export function ResponsiveConnectorDemo() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setScale(Math.min(1, w / NATURAL_WIDTH));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} style={{ height: NATURAL_HEIGHT * scale }} className="overflow-hidden">
      <div style={{ width: NATURAL_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <ConnectorDemo />
      </div>
    </div>
  );
}
