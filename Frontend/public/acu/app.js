function getFinYear() { const d = new Date(), m = d.getMonth(), y = d.getFullYear(); return m >= 3 ? `${y}-${y + 1}` : `${y - 1}-${y}`; }

const KEY = "acu_v2"; let S = Object.assign({ users: [], colleges: [], depts: [], recs: [], zeros: [], events: [], subs: {}, headings: null }, window.__ACU.S);
if (!S.reportCycle) S.reportCycle = "monthly";
if (!S.eventConfs) S.eventConfs = S.eventConf ? [{ id: Math.random().toString(36).slice(2, 10), ...S.eventConf }] : [{ id: Math.random().toString(36).slice(2, 10), p1: "IQAC", p2: "BGS", seq: "01", fy: getFinYear() }];
const save = () => window.__ACU.save(S);
var BACKHF = { college: "", dept: "", period: "" };
var BACKFILTER = { college: "", department: "", status: "", website: "", search: "", evFrom: "", evTo: "", subFrom: "", subTo: "", page: 1, size: 25 };
var bvLog = (action, desc, sid) => window.__ACU.log(action, desc, sid, window.REALU?.name || "").catch(() => { });
var bvSU = () => window.REALU?.role === "su";
var bvDate = s => s ? new Date(s).toLocaleString() : "—";
var bvDay = s => s ? String(s).slice(0, 10) : "";
const FA = "image/*,.pdf,.doc,.docx,.xlsx,.ppt,.pptx,.csv,.txt";
const idb = () => new Promise((res, rej) => { const r = indexedDB.open("acu_files", 1); r.onupgradeneeded = () => r.result.createObjectStore("f"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) });
const fPut = (id, v) => window.__ACU.fPut(id, v);
const fGet = id => window.__ACU.fGet(id);
const fDel = id => window.__ACU.fDel(id);
const imgBlob = f => new Promise(r => { const i = new Image, u = URL.createObjectURL(f); i.onload = () => { const k = Math.min(1, 1600 / Math.max(i.width, i.height)), c = document.createElement("canvas"); c.width = i.width * k; c.height = i.height * k; c.getContext("2d").drawImage(i, 0, 0, c.width, c.height); c.toBlob(b => r(b || f), "image/jpeg", .85) }; i.onerror = () => r(f); i.src = u });
const isImg = x => (x.type || "").startsWith("image/");
function hydrate(root) { root.querySelectorAll("img[data-fid]").forEach(im => fGet(im.dataset.fid).then(v => { if (v) im.src = URL.createObjectURL(v.blob) }).catch(() => { })) }
const fileChips = a => a && a.length ? `<div class="ph">${a.map(x => `<div data-sf="${x.id}" data-nm="${esc(x.name)}" title="Click to save" style="display:inline-block;margin:4px 6px 4px 0;font-size:12px;max-width:120px;vertical-align:top;cursor:pointer">${isImg(x) ? `<img data-fid="${x.id}">` : "📄"}<br>${esc(x.name)}</div>`).join("")}</div>` : "—";
async function saveFile(id, name) {
  try {
    const v = await fGet(id); if (!v) return alert("This file could not be found."); let d = null; try { d = window.claude && await window.claude.use("downloads") } catch (e) { }
    if (d) await d.save({ filename: name, data: v.blob }); else window.open(URL.createObjectURL(v.blob), "_blank")
  } catch (e) { if (!e || e.code !== "declined") alert("Could not save the file.") }
}
document.addEventListener("click", e => { const t = e.target.closest && e.target.closest("[data-sf]"); if (t) saveFile(t.dataset.sf, t.dataset.nm) });
function renderFL(i) { const el = $("#fl" + i); el.innerHTML = (FS[i] || []).map((x, k) => `<div style="display:inline-block;margin:4px 6px 4px 0;text-align:center;font-size:12px;max-width:110px;vertical-align:top">${isImg(x) ? `<img ${x.blob ? `src="${URL.createObjectURL(x.blob)}"` : `data-fid="${x.id}"`}>` : "📄"}<br><span style="word-break:break-all">${esc(x.name)}</span><br><button class="r sm" onclick="rmF(${i},${k})">Remove</button></div>`).join("") || '<span class="lg">No files added yet.</span>'; hydrate(el) }
function rmF(i, k) { FS[i].splice(k, 1); renderFL(i) }
function wireF(F, ed) {
  FS = {}; F.forEach((f, i) => {
    const [l, t] = f.split("|"); if (t !== "fu" && t !== "fp") return; FS[i] = ((ed && ed.files && ed.files[l]) || []).map(x => ({ ...x })); renderFL(i); const inp = $("#f" + i);
    inp.onchange = async () => { const mx = t === "fp" ? 6 : 10; for (const f of [...inp.files]) { if (FS[i].length >= mx) { alert("Maximum " + mx + " files for this item."); break } const im = f.type.startsWith("image/"); if (t === "fp" && !im) { alert(f.name + " is not an image and was skipped."); continue } if (t === "fu" && !im && !/\.(pdf|doc|docx|xlsx|ppt|pptx|csv|txt)$/i.test(f.name)) { alert(f.name + " is not a supported file type (PDF, Word, Excel, PowerPoint, CSV, TXT or image) and was skipped."); continue } if (FS[i].some(x => x.name === f.name && x.size === f.size)) { alert(f.name + " is already added."); continue } if (f.size > 15e6) { alert(f.name + " is larger than 15 MB and was skipped."); continue } const b = im ? await imgBlob(f) : f; FS[i].push({ id: uid() + uid(), name: im ? f.name.replace(/\.\w+$/, "") + ".jpg" : f.name, type: im ? "image/jpeg" : f.type || "application/octet-stream", size: b.size, blob: b }) } inp.value = ""; renderFL(i) }
  })
}
const orgRec = e => S.recs.find(r => r.id === e.recId);
function repRows(h, r) { let n = 0; return h[2].map(f => { const [l, t] = f.split("|"); if (t === "sec") return `<tr><th colspan="3" style="text-transform:none;font-size:14px;color:var(--tx)">${esc(l)}</th></tr>`; n++; return `<tr><td>${n}</td><td>${esc(l)}</td><td>${t === "fu" || t === "fp" ? fileChips((r.files || {})[l]) : esc(r.data[l] || "").replace(/\n/g, "<br>") || "—"}</td></tr>` }).join("") }
const repHtml = (h, r) => `<div class="tw"><table><tr><th>Sl. No.</th><th>Particulars</th><th>Details / Information</th></tr>${repRows(h, r)}</table></div>`;
const repBlock = e => { const r = orgRec(e); return r ? repHtml(H.find(h => h[0] === "evo"), r) : e.comp && e.comp.outcomes ? `<p>${e.comp.count} participants. ${esc(e.comp.outcomes)}</p>` : '<div class="empty">Report not found.</div>' };
const evUnlocked = D => { const e = EVU && S.events.find(x => x.id === EVU); return e && e.dept === D.id && ["APPROVED", "CRETURNED", "SUBMITTED"].includes(e.status) ? e : null };
function evAuto(e) {
  const m = { "Special Lecture": "Guest Lecture", "Cultural": "Cultural Event" }, t = m[e.type] || e.type, L = { "Name of the Organizing Unit": dn(e.dept), "Title of the Event": e.title, "Mode of the Event": e.mode, "Date(s) and Duration": e.date ? `From ${e.date} to ${e.dateTo || e.date}` + (e.days ? ` (${e.days} day(s))` : "") : "", "Venue / Platform / Location": e.venue };
  if (ET.includes(t) && t !== "Other") L["Type of Event"] = t; return { lock: L, pre: { "Type of Event": ET.includes(t) ? t : "Other", "Chief Guest / Resource Persons / Experts": (e.speakers || []).filter(Boolean).join("\n") } }
}
function evOpen(id) { if (!workflowOn()) return workflowUnavailable(); const D = myDepts()[0], e = S.events.find(x => x.id === id); if (!D || !e || e.dept !== D.id || !["APPROVED", "CRETURNED", "SUBMITTED"].includes(e.status)) return alert("Event Organize is available only for an approved Approval ID of your department."); EVU = id; setM(dateToM(e.date)); location.hash = "#/monthly/evo"; monthly("evo") }
const $ = s => document.querySelector(s), uid = () => Math.random().toString(36).slice(2, 10), esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const dateToM = (ds) => { const d = ds ? new Date(ds) : new Date(); if (S.reportCycle === "yearly") return d.getFullYear().toString(); if (S.reportCycle === "weekly") { const s = new Date(d.getFullYear(), 0, 1); return d.getFullYear() + "-W" + String(Math.ceil((((d - s) / 86400000) + s.getDay() + 1) / 7)).padStart(2, "0") } return d.toISOString().slice(0, 7) };
let M = dateToM(), MPREV = null;
// Opening an event jumps the reporting period to that event's month/week. The period the
// user was viewing is kept here and restored as soon as they leave the event screens, so a
// past event never leaves the dashboard or reporting screens showing old data.
const setM = (v) => { if (MPREV === null) MPREV = M; M = v };
let DD = today(), FS = {}, FO = {}, EVU = null, EVCTX = null;
let U = S.users.find(u => u.id === window.__ACU.uid) || null;
const LV = ["International", "National", "State", "Regional", "University", "Institutional"], MD = ["Online", "Offline", "Hybrid"], PS = ["Filed", "Published", "Granted"], ET = ["Conference", "Seminar", "Symposium", "FDP", "Workshop", "CME", "Webinar", "Guest Lecture", "Awareness Programme", "Cultural Event", "Sports", "Other"], LV2 = ["College", "University", "District", "State", "National", "International"], EGL = ["Each constituent college / institution shall submit one completed report for every academic event organized.", "The report should be submitted with the prescribed supporting documents/enclosures.", "Photographs should be clear, relevant and preferably include the dais, resource persons and participants.", "The information provided should be accurate, complete and supported by institutional records.", "Where applicable, the report may be used for IQAC, AQAR, accreditation, ranking, annual report and other institutional documentation."];
const defaultH = [
  ["part", "Participation Details", ["Particulars|t", "Level of Event|lv", "Title|t|*", "Attendee (Student/Staff)|t", "Name of the Attendee|t|*", "Purpose|t", "ID|t", "Designation|t", "Date|d|*", "Name of the Host Institution|t", "Mode|md", "Financial Assistance|t", "Amount in Rupees|n", "Email Id|t", "Contact No|t", "Certificate|fu", "Brochure|fu", "Report|fu"]],
  ["evo", "Events Organized", ["Name of the College / Institution|au", "Name of the Organizing Unit|dp|*", "Type of Event|ty|*", "Title of the Event|t|*", "Level of the Event|l2|*", "Mode of the Event|md|*", "Date(s) and Duration|t|*", "Time|t", "Venue / Platform / Location|t|*", "Theme / Area|t", "Target Audience|t", "Number of Participants|n|*", "Accreditation / Recognition, if any|t", "Financial Assistance / Sponsorship, if any|t", "Chief Guest / Resource Persons / Experts|ta|*", "Objectives of the Event|ta", "Brief Proceedings / Event Summary|ta|*", "Key Outcomes / Learning Outcomes|ta", "Feedback Analysis|ta", "Follow-up / Action Taken, if any|ta", "Attachments / Enclosures|sec", "Event brochure / invitation|fu|*", "Attendance sheet|fu|*", "Feedback summary|fu|*", "Selected photographs, 4 to 6|fp|*", "Certificates / other supporting documents, if applicable|fu", "Certification by the Head of the Institution / Principal|sec", "Name of Principal / Head|t|*", "Signature with Seal (upload signed copy)|fu", "Date of Submission|dn|*", "Contact Email / Phone|t|*"], [2, 3, 4, 6], EGL, "Report on Conference / Seminar / Workshop / FDP"],
  ["pat", "Patents", ["Academic Year|t", "Patent Application No.|t|*", "Status of Patent|ps", "Inventor/s Name|t|*", "Title of the Patent|t|*", "Applicant/s Name|t", "Patent Filed Date|d", "Published/Granted Date|d", "Published/Granted No.|t", "Assignee/s Name (Institute Affiliation/s at the time of Application)|t", "Evidence|fu"]],
  ["pub", "Research Publications", ["Faculty Name|t|*", "Title of the Paper|t|*", "Name of the Author/s|t", "Name of the Journal|t|*", "Year of Publication|n", "ISBN/ISSN Number|t", "Impact Factor|t", "Nature of Journal|t", "Quartile|t", "Full Article|fu"]],
  ["book", "Books / Book Chapters", ["Faculty Name|t|*", "Title of Book/Book Chapter|t|*", "Name of Author/s|t", "Year of Publication|n", "Publisher|t", "ISBN/ISSN Number|t", "Book/Book Chapter|fu"]],
  ["mou", "MoUs", ["Academic Year|t", "Organization|t|*", "Country|t", "MoU Date|d|*", "MoU Purpose|t", "Activities Under MoU|ta", "Validity|t", "Evidence|fu"]],
  ["awd", "Awards & Medals", ["Faculty/Student Name|t|*", "ID Number|t", "Title of Award/Medal|t|*", "Awarded For|t", "Awarded By|t", "Awarded Date/Year|t", "Level|lv", "Award/Medal|fu"]],
  ["spo", "Sports", ["Faculty Name|t|*", "Type of Sport Event|t|*", "Level|lv", "Sponsors|t", "Venue|t", "Date/Duration|t", "Role|t", "Secured Place|t", "Certificate|fu", "Report|fu"]],
  ["npt", "NPTEL (Staff)", ["Academic Year|t", "Name of Participant|t|*", "Type of Participant|t", "Employee ID|t", "Designation|t", "NPTEL Course Name|t|*", "Course Code|t", "Course Duration|t", "Exam Appeared|t", "Score (%)|n", "Certificate Issued|t", "Certificate Issued Date|d", "Certificate Number|t", "Certificate/Evidence|fu", "Remarks|t"]],
  ["nts", "Non-Teaching Staff Activities", ["Particulars|t", "Title|t|*", "Name of the Attendee|t|*", "Purpose|t", "Designation|t", "Date|d|*", "Name of the Host Institution|t", "Mode|md", "Email Id|t", "Contact No|t", "Report|fu"]],
  ["nss", "NSS Activities", ["Academic Year|t", "NSS Unit Number|t|*", "Name of Program Officer|t", "Name of Activity|t|*", "Activity Type|t", "Date (Start-End)|t", "Venue/Village|t", "No of Volunteers/Participants|n", "No of Beneficiaries|n", "Key Achievement|ta", "Outcome/Impact|ta", "SDG Mapping|t", "Report/Evidence|fu"]]];
// Staff-only wording: rename saved headings/fields and carry existing answers over to the new field names.
const STAFF_RENAMES = { spo: { "Faculty/Student Name": "Faculty Name" }, npt: { "ID / Employee ID": "Employee ID" } };
if (!S.headings) S.headings = defaultH;
else S.headings.forEach(h => { if (h[0] === "npt" && h[1] === "NPTEL (Students & Staff)") h[1] = "NPTEL (Staff)"; const rn = STAFF_RENAMES[h[0]] || {}; h[2] = h[2].map(f => { f = f.replace(/ Link\|l/g, "|fu").replace(/Link\|l/g, "|fu"); const [l, ...rest] = f.split("|"); return rn[l] ? [rn[l], ...rest].join("|") : f }) });
(S.recs || []).forEach(r => { const rn = STAFF_RENAMES[r.head]; if (rn && r.data) for (const [o, n] of Object.entries(rn)) if (o in r.data) { if (!(n in r.data)) r.data[n] = r.data[o]; delete r.data[o] } });
let H = S.headings;
const ST = { PENDING: ["Pending Dean/Principal Approval", "wa"], DAPPROVED: ["Dean/Principal Approved · Pending University Approval", "wa"], RETURNED: ["Returned for Correction", "er"], REJECTED: ["Rejected", "er"], APPROVED: ["Finally Approved", "ok"], SUBMITTED: ["Verification pending", "wa"], CRETURNED: ["Event Organize returned", "er"], COMPLETED: ["Completed", "ok"] };
if (!S.notifications) S.notifications = [];
// Two-level approval order: the college Dean decides first; only a University Admin may give the final approval.
const eCollege = e => (S.depts.find(d => d.id === (e && e.dept)) || {}).college || (e && e.college) || null;
const approvalStage = s => s === "PENDING" ? "dean" : s === "DAPPROVED" ? "university" : null;
const isDeanOf = e => !!U && U.role === "dean" && !!eCollege(e) && U.college === eCollege(e);
const canDecide = (e, d) => { const st = approvalStage(e && e.status); if (!st) return false; if (d === "APPROVED") return st === "university" && isGlobal(); const deanStage = st === "dean"; if (d === "DAPPROVED") return deanStage && (isDeanOf(e) || isSU()); if (d === "RETURNED" || d === "REJECTED") return deanStage ? (isDeanOf(e) || isSU()) : isGlobal(); return false };
const canVerify = e => !!e && e.status === "SUBMITTED" && (isGlobal() || (!!eCollege(e) && !!U && U.college === eCollege(e) && !U.dept && U.role !== "dept"));
const unreadNotices = () => (S.notifications || []).filter(n => !(n.read_by || []).includes(window.__ACU.uid)).length;
const notifBell = () => { const c = unreadNotices(); return `<a class="acu-bell${c ? " has" : ""}" href="#/notifications" title="Approval notices"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>${c ? `<span>${c}</span>` : ""}</a>` };
if (!S.RN) S.RN = { su: "University Admin", ca: "College Admin", dean: "Dean / Principal", dept: "Department User" };
const RN = S.RN;
const cn = id => (S.colleges.find(c => c.id === id) || {}).name || "—", dn = id => (S.depts.find(d => d.id === id) || {}).name || "—";
const isGlobal = () => isSU() || (U && !['NONE', 'dept', 'ca', 'dean'].includes(U.role) && !U.college && !U.dept);
const myDepts = () => !U ? [] : isGlobal() ? S.depts : U.dept ? S.depts.filter(d => d.id === U.dept) : S.depts.filter(d => d.college === U.college);
const myCols = () => !U ? [] : isGlobal() ? S.colleges : S.colleges.filter(c => c.id === U.college);
const workflowOn = () => S.eventWorkflowEnabled === true;
const workflowUnavailable = () => { $("#app").innerHTML = '<h2>Feature unavailable</h2><p class="s">This feature is currently turned off.</p>'; };
const myEv = () => { if (!workflowOn()) return []; const ids = myDepts().map(d => d.id); return S.events.filter(e => ids.includes(e.dept)) };
const badge = s => `<span class="b ${ST[s][1]}">${ST[s][0]}</span>`;
const hs = (d, h) => S.recs.some(x => x.dept === d && x.month === M && x.head === h) ? "data" : S.zeros.some(x => x.dept === d && x.month === M && x.head === h) ? "zero" : "none";
const tally = D => { let t = { data: 0, zero: 0, none: 0 }; D.forEach(d => H.forEach(h => t[hs(d.id, h[0])]++)); return t };
const bar = t => { const n = t.data + t.zero + t.none || 1, w = k => t[k] / n * 100; return `<div class="bar" title="Data ${t.data} · Zero ${t.zero} · Not reported ${t.none}"><i style="width:${w("data")}%;background:var(--ok)"></i><i style="width:${w("zero")}%;background:var(--gold)"></i><i style="width:${w("none")}%;background:var(--er)"></i></div>` };
const legend = `<div class="lg"><span class="ok">■</span> Data entered &nbsp;<span class="wa">■</span> Zero submitted &nbsp;<span class="er">■</span> Not reported</div>`;
const deptDone = d => H.every(h => hs(d.id, h[0]) !== "none");
const mSel = () => { const l = S.reportCycle === 'yearly' ? 'year' : S.reportCycle === 'weekly' ? 'week' : 'month', t = S.reportCycle === 'yearly' ? 'number' : S.reportCycle === 'weekly' ? 'week' : 'month'; return `<div class="noprint" style="max-width:240px;margin-bottom:24px"><label>Reporting ${l}</label><input type="${t}" value="${M}" onchange="M=this.value||M;route()" style="padding:12px;font-size:15px;background:var(--surface)"></div>` };
const cycleName = () => S.reportCycle.charAt(0).toUpperCase() + S.reportCycle.slice(1);
const cyclePeriod = () => S.reportCycle === 'yearly' ? 'year' : S.reportCycle === 'weekly' ? 'week' : 'month';

if (!S.customRoles) S.customRoles = {};
if (!S.customRoles['ca']) S.customRoles['ca'] = { desc: 'College Administrator', perms: { college: [], dept: ['view', 'create', 'edit', 'delete'], users: ['view', 'create', 'delete'], events: ['view', 'create', 'edit', 'delete', 'verify', 'approve'], reports: ['view', 'export', 'submit'] } };
if (!S.customRoles['dean']) S.customRoles['dean'] = { desc: 'Dean / Principal', perms: { college: [], dept: ['view', 'create', 'edit', 'delete'], users: [], events: ['view', 'create', 'edit', 'delete', 'verify', 'approve'], reports: ['view', 'export', 'submit'] } };
if (!S.customRoles['dept']) S.customRoles['dept'] = { desc: 'Department User', perms: { college: [], dept: [], users: [], events: ['view', 'create', 'edit', 'delete'], reports: ['view', 'export', 'submit'] } };
const isSU = () => U && U.role === 'su';
const canBackView = () => { const R = window.REALU; if (!R || !U || window.PORTAL) return false; if (R.role === 'su') return U.role === 'su' || (RN[U.role] === 'University Admin' && !U.college && !U.dept); return !['NONE', 'ca', 'dean', 'dept'].includes(R.role) && !R.college && !R.dept; };
const hasPerm = (mod, act) => {
  if (!U) return false;
  if (isSU()) return true;
  if (S.customRoles && S.customRoles[U.role]) {
    const p = S.customRoles[U.role].perms[mod];
    return p && p.includes(act);
  }
  return false;
};

let NAV = [];
function route() {
  H = S.headings;
  // A past event must not leave the rest of the app showing that event's period.
  if (MPREV !== null && !(location.hash || "").startsWith("#/monthly/evo")) { M = MPREV; MPREV = null }
  document.body.classList.remove('is-login');
  $("#app").classList.remove("back-workspace"); document.body.classList.toggle("in-back", (location.hash || "").startsWith("#/back"));
  const p = (location.hash || "#/dash").slice(2).split("/"); if (!location.hash && !window.__ACU_LANDED) { window.__ACU_LANDED = 1; const me = S.users.find(u => u.id === window.__ACU.uid); if (me && me.role === "dept") { location.replace("#/monthly"); p[0] = "monthly" } }
  U = S.users.find(u => u.id === window.__ACU.uid) || null; window.REALU = U; window.PORTAL = null; { let P = null; try { P = sessionStorage.getItem("acu_portal") } catch (e) { } if (P) { const pc = S.colleges.find(c => String(c.code || "").toLowerCase() === P); if (!pc) { try { sessionStorage.removeItem("acu_portal") } catch (e) { } } else if (U && U.role === "su") { try { sessionStorage.removeItem("acu_view") } catch (e) { } U = Object.assign({}, U, { role: "ca", college: pc.id, dept: null }); window.PORTAL = pc } else if (!U || U.college !== pc.id) { $("#nav").innerHTML = ""; $("#who").innerHTML = `<button class="g sm" onclick="window.__ACU.signOut()">Sign out</button>`; $("#app").innerHTML = `<h2>Access denied</h2><p class="s">This account is not authorized to access ${esc(pc.name)}.</p><button onclick="try{sessionStorage.removeItem('acu_portal')}catch(e){};location.href='/'">Go back</button>`; return } else window.PORTAL = pc } } if (U && U.role === "su" && !window.PORTAL) { let v = null; try { v = JSON.parse(sessionStorage.getItem("acu_view") || "null") } catch (e) { } if (v && v.role && v.role !== "su") U = Object.assign({}, U, { role: v.role, college: v.college || null, dept: v.dept || null }) } if (!U || !U.role || U.role === "NONE") { $("#nav").innerHTML = ""; $("#who").innerHTML = `<button class="g sm" onclick="window.__ACU.signOut()">Sign out</button>`; $("#app").innerHTML = `<h2>No access yet</h2><p class="s">Your account has no role assigned. Please ask your administrator.</p>`; return }
  let T = [];
  if (U.role === 'su') T = ["dash", "colleges", "depts", "users", "emails", "roles", "analytics", "reports", "settings"];
  else if (U.role === 'ca') T = ["dash", "depts", "users", "review", "analytics", "reports", "templates"];
  else if (U.role === 'dean') T = ["dash", "review", "events", "analytics", "reports"];
  else if (U.role === 'dept') T = ["dash", "events", "monthly", "reports", "templates"];
  else if (S.customRoles && S.customRoles[U.role]) {
    const perms = S.customRoles[U.role].perms || {};
    T.push("dash");
    if (perms.college && perms.college.includes("view")) T.push("colleges");
    if (perms.dept && perms.dept.includes("view")) T.push("depts");
    if (perms.users && perms.users.includes("view")) T.push("users");
    if (perms.events && (perms.events.includes("verify") || perms.events.includes("approve"))) T.push("review");
    if (perms.events && perms.events.length > 0) T.push("events");
    if (perms.reports && perms.reports.includes("export")) T.push("analytics");
    if (perms.reports && perms.reports.includes("view")) T.push("reports");
    T = [...new Set(T)];
  } else T = ["dash"];

  T.push("notifications");
  if (!workflowOn()) T = T.filter(k => !["events", "review", "notifications"].includes(k));
  if (canBackView()) { const ri = T.indexOf("reports"); T.splice(ri < 0 ? T.length : ri + 1, 0, "back"); }
  NAV = T;
  const L = { back: "BACK VIEW", dash: ({ su: "Super Admin Dashboard", ca: "College Dashboard", dean: "Dean / Principal Dashboard", dept: "Department Dashboard" })[U.role] || (isGlobal() ? "University Dashboard" : `${RN[U.role] || "Custom Role"} Dashboard`), colleges: "Colleges", depts: "Departments", users: "Users", monthly: `${cycleName()} Reporting`, events: "Event Reporting", roles: "Role", review: "Approvals & Verification", reports: "Reports", templates: "Templates", analytics: "Analytics & Export", settings: "Settings", notifications: "Approval Notices" };
  $("#who").innerHTML = viewSwitch() + (workflowOn() ? notifBell() : "") + `<b>${esc(U.name)}</b><br><small>${RN[U.role] || "Custom Role"}${U.college ? " · " + esc(cn(U.college)) : ""}${U.dept ? " · " + esc(dn(U.dept)) : ""}</small> <button class="g sm" onclick="window.__ACU.changePassword()">Change password</button> <button class="g sm" onclick="window.__ACU.signOut()">Sign out</button>`;
  const I = { dash: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", colleges: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5", depts: "M3 21h18v-2H3v2zm4-4h10v-4H7v4zm-2-6h14V7H5v4z", users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", monthly: "M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z", events: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z", roles: "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z", review: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z", reports: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z", analytics: "M3 3v18h18M21 9l-5-5-4 4-6-6", settings: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" };
  if (p[0] === "back" && canBackView()) { const cur = { event: "submissions", edit: "submissions", rec: "heads" }[p[1]] || p[1] || "dashboard"; $("#nav").innerHTML = `<div class="bv-navtitle">BACK VIEW</div>` + [["dashboard", "Dashboard", "dash"], ["submissions", "Submissions", "reports"], ["heads", "Reports (11 heads)", "monthly"], ["users", "Users", "users"], ["review", "Approvals & Verification", "review"], ["activity", "Activity log", "analytics"]].filter(([k]) => workflowOn() || !["submissions", "review", "dashboard"].includes(k)).map(([k, l, ic]) => `<a href="#/back/${k}" class="${cur === k ? "on" : ""}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="${I[ic]}"/></svg> ${l}</a>`).join("") + `<a href="#/dash" class="bv-exit">← Exit BACK VIEW</a>`; backView(p[1], p[2]); return }
  I.notifications = "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0";
  I.emails = "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6";
  L.emails = "Email & Invitations";
  $("#nav").innerHTML = T.map(k => `<a href="#/${k}" class="${p[0] === k ? "on" : ""}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="${I[k] || I.dash}"/></svg> ${L[k]}</a>`).join("");
  if (!workflowOn() && (["events", "review"].includes(p[0]))) return workflowUnavailable();
  const v = T.includes(p[0]) ? p[0] : (p[0] === "events" && workflowOn() ? "events" : T[0]); ({ back: backView, dash, colleges, depts, users, emails: accountEmails, monthly, events, review, reports, templates, analytics, settings, roles, notifications }[v])(p[1], p[2])
}
addEventListener("hashchange", route);

let EMAILFILTER = { search: "", status: "" }, EMAILSEND = new Set(), EMAILWAIT = new Map(), EMAILREQUEST = 0;
async function accountEmails() {
  if (!isSU() || window.REALU?.role !== "su" || window.PORTAL) return;
  const request = ++EMAILREQUEST;
  const root = $("#app");
  root.innerHTML = '<h2>Email & Invitations</h2><p role="status">Loading accounts…</p>';
  try {
    const result = await window.__ACU.listAccountEmailUsers();
    if (request !== EMAILREQUEST || location.hash !== "#/emails") return;
    const accounts = result.users.filter(u => u.role !== "su");
    root.innerHTML = `<div class="back-header"><h2>Email & Invitations</h2><div class="event-article-actions"><a class="back-command" href="#/users">Add user</a><button class="g" id="email-refresh" title="Refresh account status">↻ Refresh</button></div></div><div class="email-sender"><div><span class="lg">Requested sender</span><strong>${esc(result.sender)}</strong></div><span class="b">Built-in email</span></div><div class="back-stats"><div><strong>${accounts.length}</strong><span>Staff accounts</span></div><div><strong>${accounts.filter(u => u.status === 'pending').length}</strong><span>Pending activation</span></div><div><strong>${accounts.filter(u => u.status === 'active').length}</strong><span>Active accounts</span></div><div><strong>${accounts.filter(u => u.status === 'disabled').length}</strong><span>Disabled accounts</span></div></div><div class="back-filters"><div><label for="email-search">Search accounts</label><input id="email-search" type="search" value="${esc(EMAILFILTER.search)}" placeholder="Name or email"></div><div><label for="email-status">Account status</label><select id="email-status"><option value="">All accounts</option><option value="pending">Pending activation</option><option value="active">Active</option><option value="disabled">Disabled</option><option value="unknown">Unknown</option></select></div></div><p id="email-feedback" role="status" aria-live="polite"></p><div class="back-table email-table"><table><thead><tr><th>Name / Email ID</th><th>Role / Assignment</th><th>Status</th><th>Last sign-in</th><th>Actions</th></tr></thead><tbody id="email-rows"></tbody></table></div>`;
    const render = () => {
      const query = EMAILFILTER.search.toLowerCase();
      const rows = accounts.filter(u => (!EMAILFILTER.status || u.status === EMAILFILTER.status) && `${u.name} ${u.email}`.toLowerCase().includes(query));
      const actions = u => u.status === "pending" ? `<button class="sm" data-email-action="invite" data-user="${esc(u.id)}">Resend activation</button>` : u.status === "active" ? `<button class="g sm" data-email-action="reset" data-user="${esc(u.id)}">Send password reset</button>` : '—';
      $("#email-rows").innerHTML = rows.map(u => `<tr><td><strong>${esc(u.name)}</strong><br><span class="lg">${esc(u.email)}</span></td><td>${esc(RN[u.role] || u.role)}<br><span class="lg">${u.college ? esc(cn(u.college)) : u.role === "dept" || u.role === "ca" || u.role === "dean" ? "Not assigned" : "University"}${u.dept ? " · " + esc(dn(u.dept)) : ""}</span>${['dept','ca','dean'].includes(u.role) && (!u.college || (u.role === 'dept' && !u.dept)) ? `<br><a href="#/users/edit/${esc(u.id)}">Assign college / department</a>` : ''}</td><td><span class="b ${u.status === 'pending' ? 'wa' : ''}">${({ pending: 'Pending activation', active: 'Active', disabled: 'Disabled', unknown: 'Unknown' })[u.status] || 'Unknown'}</span></td><td>${esc(bvDate(u.lastLogin))}</td><td>${actions(u)}<br><a href="#/users/edit/${esc(u.id)}">Edit user</a></td></tr>`).join("") || '<tr><td colspan="5" class="empty">No staff accounts found.</td></tr>';
      document.querySelectorAll('[data-email-action]').forEach(button => {
        const waiting = EMAILSEND.has(button.dataset.user) || (EMAILWAIT.get(button.dataset.user) || 0) > Date.now();
        button.disabled = waiting;
        if (waiting) button.textContent = EMAILSEND.has(button.dataset.user) ? "Sending…" : "Sent · wait to resend";
        button.onclick = async () => {
          const id = button.dataset.user, type = button.dataset.emailAction;
          if (EMAILSEND.has(id) || (EMAILWAIT.get(id) || 0) > Date.now()) return;
          const account = accounts.find(u => u.id === id);
          if (!account || !confirm(`Send ${type === 'invite' ? 'an activation' : 'a password-reset'} email to ${account.email}?`)) return;
          EMAILSEND.add(id); render();
          try {
            if (type === 'invite') await window.__ACU.resendInvite(id);
            else await window.__ACU.sendAccountPasswordReset(id);
            EMAILWAIT.set(id, Date.now() + 60000);
            if (location.hash === '#/emails') { $("#email-feedback").className = 'ok'; $("#email-feedback").textContent = `Email request accepted for ${account.email}.`; }
          } catch (error) {
            if (location.hash === '#/emails') { $("#email-feedback").className = 'rq'; $("#email-feedback").textContent = error.message || 'The email could not be sent.'; }
          } finally { EMAILSEND.delete(id); if (location.hash === '#/emails') { render(); setTimeout(() => { if (request === EMAILREQUEST && location.hash === '#/emails') render(); }, 60000); } }
        };
      });
    };
    $("#email-status").value = EMAILFILTER.status;
    $("#email-search").oninput = e => { EMAILFILTER.search = e.target.value; render(); };
    $("#email-status").onchange = e => { EMAILFILTER.status = e.target.value; render(); };
    $("#email-refresh").onclick = accountEmails;
    render();
  } catch (error) {
    if (request === EMAILREQUEST && location.hash === '#/emails') { root.innerHTML = '<h2>Email & Invitations</h2><p class="rq" role="alert"></p><button id="email-retry">Retry</button>'; root.querySelector('[role="alert"]').textContent = error.message || 'Accounts could not be loaded.'; $("#email-retry").onclick = accountEmails; }
  }
}

function backRecs() { return S.recs.filter(r => myDepts().some(d => d.id === r.dept) && (!BACKHF.college || r.college === BACKHF.college) && (!BACKHF.dept || r.dept === BACKHF.dept) && (!BACKHF.period || r.month === BACKHF.period)); }
function backHeads(hk) {
  const recs = backRecs(), cols = S.colleges.filter(c => myDepts().some(d => d.college === c.id)), periods = [...new Set(S.recs.map(r => r.month).filter(Boolean))].sort().reverse();
  const filt = `<div class="back-filters"><div><label for="bh-college">College</label><select id="bh-college"><option value="">All colleges</option>${cols.map(c => `<option value="${esc(c.id)}"${BACKHF.college === c.id ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div><div><label for="bh-dept">Department</label><select id="bh-dept"><option value="">All departments</option>${myDepts().filter(d => !BACKHF.college || d.college === BACKHF.college).map(d => `<option value="${esc(d.id)}"${BACKHF.dept === d.id ? " selected" : ""}>${esc(d.name)}</option>`).join("")}</select></div><div><label for="bh-period">Period</label><select id="bh-period"><option value="">All periods</option>${periods.map(m => `<option${BACKHF.period === m ? " selected" : ""}>${esc(m)}</option>`).join("")}</select></div></div>`;
  const h = hk && H.find(x => x[0] === hk);
  if (!h) {
    $("#app").innerHTML = `<h2>Department reports · all ${H.length} heads</h2><p class="s">Every record submitted by Department Users, grouped by reporting heading.</p>${filt}<div class="back-table"><table><thead><tr><th>#</th><th>Heading</th><th>Records</th><th>Departments reporting</th><th>Zero submissions</th><th></th></tr></thead><tbody>${H.map((x, i) => { const rs = recs.filter(r => r.head === x[0]), zs = S.zeros.filter(z => z.head === x[0] && myDepts().some(d => d.id === z.dept) && (!BACKHF.dept || z.dept === BACKHF.dept) && (!BACKHF.period || z.month === BACKHF.period) && (!BACKHF.college || (S.depts.find(d => d.id === z.dept) || {}).college === BACKHF.college)); return `<tr><td>${i + 1}</td><td><strong>${x[1]}</strong></td><td>${rs.length}</td><td>${new Set(rs.map(r => r.dept)).size}</td><td>${zs.length}</td><td><a class="back-command back-small" href="#/back/heads/${x[0]}">Open →</a></td></tr>` }).join("")}</tbody></table></div>`;
  } else {
    const rs = recs.filter(r => r.head === hk).slice().reverse(), F = h[2].map(s => s.split("|")[0]);
    $("#app").innerHTML = `<p><a href="#/back/heads">← All ${H.length} heads</a></p><h2>${h[1]}</h2>${filt}<p class="lg">${rs.length} record${rs.length === 1 ? "" : "s"} · all fields shown</p><p class="noprint"><button class="g sm" onclick="headReport('${hk}','print',true)">Print this head</button> <button class="sm" onclick="headReport('${hk}','pdf',true)">Download PDF</button></p><div class="back-table"><table><thead><tr><th>College / Department</th><th>Period</th><th>Submitted by</th>${F.map(f => `<th>${esc(f)}</th>`).join("")}<th>Files</th><th></th></tr></thead><tbody>${rs.map(r => `<tr><td>${esc(cn(r.college))}<br><small>${esc(dn(r.dept))}</small></td><td>${esc(r.month || "—")}</td><td>${esc(r.by || "—")}</td>${F.map(f => `<td>${esc(String(r.data?.[f] ?? "—"))}</td>`).join("")}<td>${Object.values(r.files || {}).flat().length}</td><td><a class="back-command back-small" href="#/back/rec/${esc(r.id)}">View →</a>${r.article ? `<br><button class="g sm" onclick="backArticle('${r.id}')">Article / PDF</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="${F.length + 5}" class="empty">No records for this heading.</td></tr>`}</tbody></table></div>`;
  }
  const go = () => backView("heads", hk);
  $("#bh-college").onchange = e => { BACKHF.college = e.target.value; BACKHF.dept = ""; go() };
  $("#bh-dept").onchange = e => { BACKHF.dept = e.target.value; go() };
  $("#bh-period").onchange = e => { BACKHF.period = e.target.value; go() };
}
function backRec(id) {
  const r = S.recs.find(x => x.id === id && myDepts().some(d => d.id === x.dept)), h = r && H.find(x => x[0] === r.head);
  if (!h) { $("#app").innerHTML = `<p><a href="#/back/heads">← All heads</a></p><div class="empty">Record not found.</div>`; return }
  $("#app").innerHTML = `<p class="noprint"><a href="#/back/heads/${h[0]}">← Back to ${h[1]}</a></p><h2>${h[1]}</h2><p class="s">${esc(cn(r.college))} · ${esc(dn(r.dept))} · ${esc(r.month || "")} · by ${esc(r.by || "—")}</p><div class="tw"><table><tr><th>Sl. No.</th><th>Particulars</th><th>Details / Information</th></tr>${repRows(h, r)}</table></div><div class="noprint"><button onclick="print()">Print record</button>${r.article ? ` <button class="g" onclick="backArticle('${r.id}')">View article / Download PDF</button>` : ""}</div>`;
  hydrate($("#app"));
}
async function backArticle(id) {
  if (!canBackView()) return;
  const record = S.recs.find(r => r.id === id && myDepts().some(d => d.id === r.dept));
  if (!record?.article) return;
  const photos = [];
  try {
    for (const [label, files] of Object.entries(record.files || {})) for (const file of files) if (isImg(file)) { const stored = await fGet(file.id); if (!stored) throw new Error("Photo unavailable"); photos.push({ name: file.name, label, data: await aiImg(stored.blob) }); }
  } catch (error) { return alert(error.message || "Could not load report photos."); }
  AIFORM = null; AIART = record.article; AIIMAGES = photos; AIHEAD = record.head; AIOWNER = window.__ACU.uid; AIORIGIN = location.hash; aiShow();
}

function setup() {
  document.body.classList.add('is-login');
  $("#who").innerHTML = ""; $("#nav").innerHTML = "";
  const logoSVG = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
  $("#app").innerHTML = `
<div class="login-split">
  <div class="login-left">
    <div class="login-brand">
      <div style="background:rgba(255,255,255,0.2);padding:8px;border-radius:12px;backdrop-filter:blur(4px)">${logoSVG}</div>
      <div>
        <h1>Adichunchanagiri<br>University</h1>
        <p>Event Management System<br><small>Events | Knowledge | Collaboration</small></p>
      </div>
    </div>
    <div class="login-footer">
      One University<br>Many Initiatives<br>Greater Impact
    </div>
  </div>
  <div class="login-right">
    <div class="login-right-inner">
      <h2>No account access</h2>
      <p class="sub">Your account has not been set up yet. Please contact your university administrator.</p>
    </div>
  </div>
</div>`;
}
function login() {
  document.body.classList.add('is-login');
  $("#who").innerHTML = ""; $("#nav").innerHTML = "";
  const logoSVG = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;

  let uOpts = '';
  const rolesList = ['su', 'ca', 'dean', 'dept', ...(S.customRoles ? Object.keys(S.customRoles) : [])];
  const uniqueRoles = [...new Set(rolesList)];
  uniqueRoles.forEach(r => {
    const ru = S.users.filter(u => u.role === r);
    if (ru.length) {
      uOpts += `<optgroup label="${esc(RN[r] || r)}">${ru.map(u => `<option value="${u.id}">${esc(u.name)}</option>`).join("")}</optgroup>`;
    }
  });

  $("#app").innerHTML = `
<div class="login-split">
  <div class="login-left">
    <div class="login-brand">
      <div style="background:rgba(255,255,255,0.2);padding:8px;border-radius:12px;backdrop-filter:blur(4px)">${logoSVG}</div>
      <div>
        <h1>Adichunchanagiri<br>University</h1>
        <p>Event Management System<br><small>Events | Knowledge | Collaboration</small></p>
      </div>
    </div>
    <div class="login-footer">
      One University<br>Many Initiatives<br>Greater Impact
    </div>
  </div>
  <div class="login-right">
    <div class="login-right-inner">
      <h2>Welcome</h2>
      <p class="sub">Sign in to continue to<br>ACU Event Management System</p>
      <div class="l-input-wrap">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        <select id="l_u">
          ${uOpts}
        </select>
      </div>
      <div class="l-input-wrap">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        <input id="l_p" type="password" placeholder="Password">
        <svg id="eye" style="left:auto;right:14px;cursor:pointer" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
      </div>
      <div class="l-opts">
        <label><input type="checkbox"> Remember me</label>
        <a href="javascript:alert('Forgot Password is not configured in this offline demo.')">Forgot Password?</a>
      </div>
      <button id="l_g" class="btn-primary">Sign In <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></button>
      <div class="l-divider">OR</div>
      <button class="btn-google" onclick="alert('Google SSO is not connected in this demo.')">
        <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Sign in with Google <span style="opacity:0.6;font-size:12px;font-weight:400">(ACU Email ID)</span>
      </button>
    </div>
  </div>
</div>`;
  $("#eye").onclick = function () { const p = $("#l_p"); if (p.type === "password") { p.type = "text"; this.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`; } else { p.type = "password"; this.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`; } };
  $("#l_g").onclick = () => { const u = S.users.find(x => x.id === $("#l_u").value); if (!u || u.pin !== $("#l_p").value) return alert("Wrong passcode."); try { sessionStorage.setItem("acu_s", u.id) } catch (e) { } U = u; route() }
}

function dash() {
  const D = myDepts(), t = tally(D), E = myEv(), n = f => E.filter(f).length; const sub = U.college && S.subs[U.college + "|" + M];
  let h = `<h2>${esc(({ su: "Super Admin Dashboard", ca: "College Dashboard", dean: "Dean / Principal Dashboard", dept: "Department Dashboard" })[U.role] || (isGlobal() ? "University Dashboard" : `${RN[U.role] || "Custom Role"} Dashboard`))}</h2><p class="s">${isGlobal() ? "Consolidated view of all colleges" : esc(cn(U.college))}. All figures are counted from records entered in this system.</p>${mSel()}<div class="grid" style="margin-top:12px">`;
  const st = [...(isGlobal() ? [["Colleges", S.colleges.length]] : []), ["Departments", D.length], ["Reports with data", t.data], ["Zero submissions", t.zero], ["Not reported", t.none], ["Events", E.length], ["Pending college dean approval", n(e => e.status === "PENDING")], ["Pending university approval", n(e => e.status === "DAPPROVED")], ["Verification pending", n(e => e.status === "SUBMITTED")], ["Completed events", n(e => e.status === "COMPLETED")]].filter(([label]) => workflowOn() || !["Events", "Pending college dean approval", "Pending university approval", "Verification pending", "Completed events"].includes(label));
  h += st.map(x => `<div class="card stat"><b>${x[1]}</b><span>${x[0]}</span></div>`).join("") + `</div>`;
  if (!D.length) h += `<div class="card empty" style="margin-top:16px">${isGlobal() ? "Start by adding colleges and users." : hasPerm('dept', 'create') ? "Start by adding departments and department users." : "No department is assigned yet."}</div>`;
  if (isGlobal() && S.colleges.length) h += `<div class="card" style="margin-top:16px"><h3>College-wise reporting status (${M})</h3>${legend}<div class="tw"><table><tr><th>College</th><th>Depts</th><th>Depts complete</th><th>Status</th><th>Submitted to university</th></tr>${S.colleges.map(c => { const ds = S.depts.filter(d => d.college === c.id); return `<tr><td>${esc(c.name)}</td><td>${ds.length}</td><td>${ds.filter(deptDone).length}</td><td>${bar(tally(ds))}</td><td>${S.subs[c.id + "|" + M] ? '<span class="ok">Yes</span>' : "No"}</td></tr>` }).join("")}</table></div></div>`;
  else if (!isGlobal() && D.length) h += `<div class="card" style="margin-top:16px"><h3 id="dwts_t" style="cursor:pointer" title="Click to show or hide">Department-wise reporting status (${M}) <small id="dwts_a" style="font-weight:600">▸</small></h3><div id="dwts_b" style="display:none">${legend}<div class="tw"><table><tr><th>Department</th><th>Headings done</th><th>Status</th></tr>${D.map(d => `<tr><td>${esc(d.name)}</td><td>${H.filter(x => hs(d.id, x[0]) !== "none").length}/${H.length}</td><td>${bar(tally([d]))}</td></tr>`).join("")}</table></div></div></div>`;
  if (D.length) h += `<div class="card"><h3>Category-wise activity (${M})</h3><div class="tw"><table><tr><th>Heading</th><th>Records</th><th>Zero</th><th>Not reported</th></tr>${H.map(x => { let r = S.recs.filter(y => y.head === x[0] && y.month === M && D.some(d => d.id === y.dept)).length, z = D.filter(d => hs(d.id, x[0]) === "zero").length, o = D.filter(d => hs(d.id, x[0]) === "none").length; return `<tr><td>${x[1]}</td><td>${r}</td><td>${z}</td><td>${o}</td></tr>` }).join("")}</table></div></div>`;
  if (hasPerm('reports', 'submit')) { const ok = D.length && D.every(deptDone); h += `<div class="card"><h3>Submit ${M} report to University</h3>${sub ? `<span class="ok">Submitted by ${esc(sub.by)} on ${sub.at.slice(0, 10)}.</span>` : `<p>${D.filter(deptDone).length} of ${D.length} departments have completed all ${H.length} headings.</p><button id="sb">Submit college report to University</button>`}</div>` }
  if (workflowOn()) h += `<div class="card"><h3><a href="#/events" title="Open all events">Recent events →</a></h3>${trk(E.slice(-8).reverse())}<p style="margin:10px 0 0"><a href="#/events"><button class="g sm">View all events (${E.length})</button></a></p></div>`; $("#app").innerHTML = h;
  // The department-wise status table stays folded until someone clicks its heading.
  if ($("#dwts_t")) $("#dwts_t").onclick = () => { const b = $("#dwts_b"), on = b.style.display !== "none"; b.style.display = on ? "none" : ""; $("#dwts_a").textContent = on ? "▸" : "▾" };
  if ($("#sb")) $("#sb").onclick = () => { if (!D.every(deptDone) && !confirm("Some departments have not completed all headings. Submit anyway?")) return; S.subs[U.college + "|" + M] = { by: U.name, at: new Date().toISOString() }; log0(); save(); dash() }
}
function log0() { }
function trk(E) { return E.length ? `<div class="tw"><table><tr><th>Event ID</th><th>Event</th><th>Department</th><th>Date</th><th>Status</th></tr>${E.map(e => `<tr><td><a href="#/events/view/${e.id}"><code>${esc(e.num)}</code></a></td><td>${esc(e.title)}</td><td>${esc(dn(e.dept))}</td><td>${e.date}</td><td>${badge(e.status)}</td></tr>`).join("")}</table></div>` : `<div class="empty">No events yet.</div>` }

function colleges(a, id) {
  const canMan = isGlobal() || hasPerm('college', 'edit');
  const canCre = isGlobal() || hasPerm('college', 'create');
  if (a === 'manage' && id) {
    if (!canMan && U.college !== id) return route();
    const c = S.colleges.find(x => x.id === id); if (!c) return route();
    let cfs = S.eventConfs.filter(x => x.college === id);
    if (cfs.length === 0) { S.eventConfs.push({ id: uid(), p1: "IQAC", p2: "BGS", seq: "01", fy: getFinYear(), college: id }); save(); cfs = S.eventConfs.filter(x => x.college === id); }
    const ds = S.depts.filter(d => d.college === id), us = S.users.filter(u => u.college === id);
    $("#app").innerHTML = `<p><a href="#/colleges">← Colleges</a></p><h2>Manage College: ${esc(c.name)}</h2><div class="card" style="margin-bottom:24px"><h3>Overview</h3><p>Code: <code>${esc(c.code)}</code></p><p>Departments: ${ds.length}</p><p>Users: ${us.length}</p></div><div class="card" style="margin-bottom:24px"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px"><h3 style="margin:0">Assigned Departments</h3><button class="g sm" id="mc_add_dept_toggle" style="margin:0">+ Add Department</button></div><p class="s" style="margin-top:-4px">Departments operating under ${esc(c.name)}.</p><div id="mc_dept_form" style="display:none; background:var(--ac2); border:1px solid var(--ln); border-radius:8px; padding:16px; margin-bottom:16px"><h4 style="margin:0 0 10px; font-size:14px; color:var(--tx)">Add New Department</h4><div class="row"><div><label style="margin-top:0">Department name *</label><input id="mc_dn" placeholder="e.g. Mechanical Engineering"></div><div><label style="margin-top:0">Head of department</label><input id="mc_dh" placeholder="e.g. Dr. Ramesh"></div></div><details style="margin-top:12px"><summary style="font-size:13px; color:var(--ac); cursor:pointer; font-weight:600">Assign Login Users (Optional)</summary><div style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--ln)"><p class="s" style="margin:0 0 8px; font-size:12px">Create login accounts scoped to this department.</p><div class="row"><div><label style="margin-top:0">User 1 full name</label><input id="mc_u1n"></div><div><label style="margin-top:0">User 1 email</label><input id="mc_u1e" type="email"></div></div><div class="row" style="margin-top:8px"><div><label style="margin-top:0">User 2 full name</label><input id="mc_u2n"></div><div><label style="margin-top:0">User 2 email</label><input id="mc_u2e" type="email"></div></div></div></details><div style="display:flex; gap:8px; margin-top:14px"><button class="g sm" id="mc_save_dept" style="margin:0">Save Department</button><button class="sm" id="mc_cancel_dept" style="margin:0">Cancel</button></div></div>${ds.length ? `<div class="tw"><table class="department-table"><tr><th>Name</th><th>HOD</th><th>Login Users</th><th>Action</th></tr>${ds.map(d => `<tr><td>${esc(d.name)}</td><td>${esc(d.hod || "—")}</td><td>${esc(S.users.filter(u => u.dept === d.id && u.college === d.college).map(u => u.name).join(", ") || "Not assigned")} ${canMan ? `<a class="department-assign" href="#/users/assign/${d.id}">Assign user</a>` : ""}</td><td style="white-space:nowrap">${isSU() || canMan ? `<button class="g sm" onclick="editDept('${d.id}')">Edit</button> <button class="r sm" onclick="delDept('${d.id}')">Delete</button>` : ""}</td></tr>`).join("")}</table></div>` : '<div class="empty">No departments assigned to this college yet.</div>'}</div><div class="card" style="margin-bottom:24px"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px"><h3 style="margin:0">Event ID Configurations</h3><button class="g sm" id="c_add_conf" style="margin:0">+ Add New</button></div><p class="s" style="margin-top:-4px">Set multiple Event ID formats for ${esc(c.code)}. Departments can choose which format to use when creating an event.</p><div class="tw"><table><tr><th>Prefix 1</th><th>Prefix 2</th><th>Next Sequence</th><th>Financial Year</th><th>Action</th></tr>${cfs.map(conf => `<tr><td><input id="p1_${conf.id}" value="${esc(conf.p1)}" style="margin:0; min-width:80px"></td><td><input id="p2_${conf.id}" value="${esc(conf.p2)}" style="margin:0; min-width:80px"></td><td><input id="sq_${conf.id}" value="${esc(conf.seq)}" style="margin:0; min-width:60px" title="E.g. '01'"></td><td><input value="${esc(getFinYear())}" style="margin:0; min-width:80px" disabled></td><td style="white-space:nowrap"><button class="g sm c_save_conf" data-id="${conf.id}" style="margin:0 4px 0 0">Save</button><button class="r sm c_del_conf" data-id="${conf.id}" style="margin:0" ${cfs.length === 1 ? "disabled" : ""}>Delete</button></td></tr>`).join("")}</table></div></div>`;
    if ($("#mc_add_dept_toggle")) $("#mc_add_dept_toggle").onclick = () => { const f = $("#mc_dept_form"); if (f) f.style.display = f.style.display === "none" ? "block" : "none"; };
    if ($("#mc_cancel_dept")) $("#mc_cancel_dept").onclick = () => { const f = $("#mc_dept_form"); if (f) f.style.display = "none"; };
    if ($("#mc_save_dept")) $("#mc_save_dept").onclick = async () => {
      const dn = $("#mc_dn").value.trim();
      if (!dn) return alert("Department name required.");
      if (S.depts.some(d => d.college === id && d.name.toLowerCase() === dn.toLowerCase())) return alert("Department with this name already exists in this college.");
      const accounts = ["1", "2"].map(s => ({ name: $("#mc_u" + s + "n").value.trim(), email: $("#mc_u" + s + "e").value.trim().toLowerCase() })).filter(u => u.name || u.email);
      if (accounts.some(u => !u.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email))) return alert("For each login user, enter both a name and a valid email.");
      if (accounts.length === 2 && accounts[0].email === accounts[1].email) return alert("User 1 and User 2 need different email addresses.");
      const allEmails = new Set(S.users.map(u => (u.email || "").toLowerCase()).filter(Boolean));
      for (const u of accounts) { if (allEmails.has(u.email)) return alert(`Email "${u.email}" is already used by another account.`); }
      const did = uid();
      S.depts.push({ id: did, college: id, name: dn, code: dn.substring(0, 4).toUpperCase(), hod: $("#mc_dh").value.trim() });
      accounts.forEach(u => S.users.push({ id: uid(), ...u, role: "dept", college: id, dept: did, pending: true }));
      $("#mc_save_dept").disabled = true;
      await save();
      colleges('manage', id);
    };
    if ($("#c_add_conf")) { $("#c_add_conf").onclick = () => { S.eventConfs.push({ id: uid(), p1: "IQAC", p2: "BGS", seq: "01", fy: getFinYear(), college: id }); save(); colleges('manage', id); }; document.querySelectorAll(".c_save_conf").forEach(b => b.onclick = (e) => { const cid = e.target.dataset.id, conf = S.eventConfs.find(x => x.id === cid); if (conf) { conf.p1 = $("#p1_" + cid).value.trim() || "IQAC"; conf.p2 = $("#p2_" + cid).value.trim() || "BGS"; conf.seq = $("#sq_" + cid).value.trim() || "01"; save(); alert("Configuration saved."); } }); document.querySelectorAll(".c_del_conf").forEach(b => b.onclick = (e) => { const cid = e.target.dataset.id; if (cfs.length > 1 && confirm("Delete this configuration?")) { S.eventConfs = S.eventConfs.filter(x => x.id !== cid); save(); colleges('manage', id); } }); }
    return;
  }
  $("#app").innerHTML = `<h2>Colleges</h2><p class="s">Each college is a separate scope: its users only see its own departments and data.</p>${canCre ? `<div class="card"><div class="row"><div><label>College name *</label><input id="c_n" placeholder="e.g. Adichunchanagiri Institute of Technology"></div><div><label>College code * (used in Event ID)</label><input id="c_c" placeholder="e.g. AIT"></div></div><button id="c_g" style="margin-top:16px">Create college</button></div>` : ``}
  <div class="card">${S.colleges.length ? `<div class="tw"><table><tr><th>Name</th><th>Code</th><th>Link</th><th>Departments</th><th>Users</th><th>Action</th></tr>${S.colleges.map(c => `<tr><td>${esc(c.name)}</td><td><code>${esc(c.code)}</code></td><td><a class="clink" href="${collegeUrl(c)}" target="_blank" rel="noopener">${esc(collegeUrl(c))}</a></td><td><a href="#/depts/college/${c.id}">${S.depts.filter(d => d.college === c.id).length}</a></td><td>${S.users.filter(u => u.college === c.id).length}</td><td style="white-space:nowrap">${canMan || U.college === c.id ? `<a href="#/colleges/manage/${c.id}"><button class="sm">Manage</button></a> ` : ``}${canMan ? `<button class="g sm" onclick="editCollege('${c.id}')">Edit</button> ` : ``}${canMan || isSU() ? `<button class="r sm" onclick="delCollege('${c.id}')">Delete</button>` : ``}</td></tr>`).join("")}</table></div>` : '<div class="empty">No colleges yet.</div>'}</div>`;

  if ($("#c_g")) $("#c_g").onclick = async () => {
    const n = $("#c_n").value.trim(), k = $("#c_c").value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!n || !k) return alert("College name and code required.");
    if (S.colleges.some(c => c.code === k)) return alert("Code already used.");

    const cid = uid();
    S.colleges.push({ id: cid, name: n, code: k });
    S.eventConfs.push({ id: uid(), p1: "IQAC", p2: "BGS", seq: "01", fy: getFinYear(), college: cid });

    $("#c_g").disabled = true;
    await save();
    colleges();
  };
}
const collegeUrl = c => (typeof window !== "undefined" ? window.location.origin : "https://acudigiverse.com") + "/" + String(c.code || "").toLowerCase();
window.copyCollegeLink = id => { const c = S.colleges.find(x => x.id === id); if (!c) return; const url = collegeUrl(c); (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => alert("Link copied: " + url), () => prompt("Copy this link:", url)) };
window.editCollege = async id => {
  const canEdit = isSU() || isGlobal() || hasPerm('college', 'edit');
  if (!canEdit) return alert("You do not have permission to edit this college.");
  const c = S.colleges.find(x => x.id === id);
  if (!c) return;
  const n = prompt("College name:", c.name);
  if (n === null) return;
  const k = prompt("College code:", c.code);
  if (k === null) return;
  const kk = k.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!n.trim() || !kk) return alert("Name and code required.");
  if (S.colleges.some(x => x.code === kk && x.id !== id)) return alert("Code already used.");
  c.name = n.trim();
  c.code = kk;
  await save();
  route();
};
window.delCollege = async id => {
  const canDel = isSU() || isGlobal() || hasPerm('college', 'delete') || hasPerm('college', 'edit');
  if (!canDel) return alert("You do not have permission to delete this college.");
  const c = S.colleges.find(x => x.id === id);
  if (!c) return;
  const ds = S.depts.filter(d => d.college === id);
  if (!confirm(`Delete college "${c.name}"? This will delete this college, its ${ds.length} department(s), and unassign/remove associated users and records. This cannot be undone.`)) return;

  const deptIds = new Set(ds.map(d => d.id));

  // Reset college/dept for Super Admin or current user; remove scoped college/dept users
  (S.users || []).forEach(u => {
    if (u.college === id || deptIds.has(u.dept)) {
      if (u.id === U.id || u.role === 'su') {
        u.college = null;
        u.dept = null;
      }
    }
  });
  S.users = (S.users || []).filter(u => !((u.college === id || deptIds.has(u.dept)) && u.id !== U.id && u.role !== 'su'));

  // Remove events, records, zeros, templates, eventConfs, depts, subs, and college
  S.events = (S.events || []).filter(e => e.college !== id && !deptIds.has(e.dept));
  S.recs = (S.recs || []).filter(r => r.college !== id && !deptIds.has(r.dept));
  S.zeros = (S.zeros || []).filter(z => !deptIds.has(z.dept));
  if (S.templates) S.templates = S.templates.filter(t => t.college !== id && !deptIds.has(t.dept));
  if (S.subs) {
    Object.keys(S.subs).forEach(k => {
      if (k.startsWith(id + "|") || k === id) delete S.subs[k];
    });
  }
  S.eventConfs = (S.eventConfs || []).filter(x => x.college !== id);
  S.depts = (S.depts || []).filter(d => d.college !== id);
  S.colleges = (S.colleges || []).filter(x => x.id !== id);

  await save();
  route();
};
window.editDept = async id => {
  const d = S.depts.find(x => x.id === id); if (!d) return;
  const canEdit = isSU() || (U && U.role === 'ca' && d.college === U.college) || hasPerm('dept', 'edit');
  if (!canEdit) return alert("You do not have permission to edit this department.");
  const n = prompt("Department name:", d.name); if (n === null) return;
  const h = prompt("Head of department:", d.hod || ""); if (h === null) return;
  if (!n.trim()) return alert("Name required.");
  d.name = n.trim(); d.hod = h.trim();
  await save();
  route();
};
window.delDept = async id => {
  const d = S.depts.find(x => x.id === id); if (!d) return;
  const canDel = isSU() || (U && U.role === 'ca' && d.college === U.college) || hasPerm('dept', 'delete');
  if (!canDel) return alert("You do not have permission to delete this department.");
  if (!confirm(`Delete department "${d.name}" and remove associated records? This cannot be undone.`)) return;

  // Reset dept for Super Admin or current user; remove scoped dept users
  (S.users || []).forEach(u => {
    if (u.dept === id) {
      if (u.id === U.id || u.role === 'su') {
        u.dept = null;
      }
    }
  });
  S.users = (S.users || []).filter(u => !(u.dept === id && u.id !== U.id && u.role !== 'su'));

  S.events = (S.events || []).filter(e => e.dept !== id);
  S.recs = (S.recs || []).filter(r => r.dept !== id);
  S.zeros = (S.zeros || []).filter(z => z.dept !== id);
  if (S.templates) S.templates = S.templates.filter(t => t.dept !== id);
  S.depts = S.depts.filter(x => x.id !== id);

  await save();
  route();
};
function depts(a, fid) {
  const gl = isGlobal(); let cid = U.college; if (gl && a === "college" && fid) cid = fid; const list = gl ? (cid && a === "college" ? S.depts.filter(d => d.college === cid) : S.depts) : myDepts(); const su = isSU();
  $("#app").innerHTML = `<h2>Departments</h2><p class="s">${gl ? "All colleges and their departments." : esc(cn(cid)) + "."} Add a department and, optionally, create its login user at the same time.</p>${gl ? `<div class="card"><label>Show college</label><select id="d_f"><option value="">All colleges</option>${S.colleges.map(c => `<option value="${c.id}" ${a === "college" && fid === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>` : ""}<div class="card"><div class="row">${gl ? `<div><label>College *</label><select id="d_c">${S.colleges.map(c => `<option value="${c.id}" ${cid === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>` : ""}<div><label>Department name *</label><input id="d_n"></div><div><label>Head of department</label><input id="d_h"></div></div>
<h3 style="margin-top:16px">Department User 1 (optional)</h3><div class="row"><div><label for="d_un">User 1 full name</label><input id="d_un"></div><div><label for="d_ue">User 1 email ID</label><input id="d_ue" type="email"></div></div>
<h3 style="margin-top:16px">Department User 2 (optional)</h3><div class="row"><div><label for="d_un2">User 2 full name</label><input id="d_un2"></div><div><label for="d_ue2">User 2 email ID</label><input id="d_ue2" type="email"></div></div>
<button id="d_g" style="margin-top:16px">Add department</button></div>
<div class="card">${list.length ? `<div class="tw"><table class="department-table"><tr>${gl ? "<th>College</th>" : ""}<th>Name</th><th>HOD</th><th>Login user</th>${su ? "<th>Action</th>" : ""}</tr>${list.map(d => `<tr>${gl ? `<td>${esc(cn(d.college))}</td>` : ""}<td>${esc(d.name)}</td><td>${esc(d.hod || "—")}</td><td>${esc(S.users.filter(u => u.dept === d.id && u.college === d.college).map(u => u.name).join(", ") || "Not assigned")}${gl || U.role === "ca" ? `<a class="department-assign" href="#/users/assign/${d.id}">Assign user</a>` : ""}</td>${su ? `<td class="department-actions"><button class="g sm" onclick="editDept('${d.id}')">Edit</button> <button class="r sm" onclick="delDept('${d.id}')">Delete</button></td>` : ""}</tr>`).join("")}</table></div>` : '<div class="empty">No departments yet.</div>'}</div>`;
  if ($("#d_f")) $("#d_f").onchange = e => { location.hash = e.target.value ? "#/depts/college/" + e.target.value : "#/depts" };
  $("#d_g").onclick = async () => { const n = $("#d_n").value.trim(); if (!n) return alert("Name required."); const c = gl ? ($("#d_c") ? $("#d_c").value : "") : cid; if (!c) return alert("Create a college first."); const accounts = ["", "2"].map(suffix => ({ name: $("#d_un" + suffix).value.trim(), email: $("#d_ue" + suffix).value.trim().toLowerCase() })).filter(user => user.name || user.email); if (accounts.some(user => !user.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email))) return alert("For each Department User, enter both a name and a valid email."); if (accounts.length === 2 && accounts[0].email === accounts[1].email) return alert("The two Department Users need different email addresses."); const did = uid(); S.depts.push({ id: did, college: c, name: n, code: n.substring(0, 4).toUpperCase(), hod: $("#d_h").value.trim() }); accounts.forEach(user => S.users.push({ id: uid(), ...user, role: "dept", college: c, dept: did, pending: true })); $("#d_g").disabled = true; await save(); route() }
}
window.delUser = (id) => {
  const target = S.users.find(x => x.id === id);
  if (!target) return;
  const su = isSU();
  const ca = U.role === 'ca';
  if (!(su || (ca && target.role === 'dept') || hasPerm('users', 'delete'))) {
    return alert("You do not have permission to delete this user.");
  }
  if (confirm("Are you sure you want to delete this user?")) { S.users = S.users.filter(x => x.id !== id); save(); users(); }
};
function roles(a, rId) {
  if (a === "edit" && rId) {
    const roleUsers = S.users.filter(u => u.role === rId);

    const modules = [
      { id: 'college', name: 'College', icon: '🏛️' },
      { id: 'dept', name: 'Department', icon: '🏢' },
      { id: 'users', name: 'Users', icon: '👥' },
      { id: 'events', name: 'Events', icon: '📅' },
      { id: 'reports', name: 'Reports', icon: '📊' },
    ];
    const all = ['view', 'create', 'edit', 'delete', 'verify', 'approve', 'export', 'submit'];
    const allowed = { college: all, dept: all, users: all, events: all, reports: all };

    let selected = S.customRoles && S.customRoles[rId] && S.customRoles[rId].perms ?
      JSON.parse(JSON.stringify(S.customRoles[rId].perms)) :
      { college: [], dept: [], users: [], events: [], reports: [] };

    $("#app").innerHTML = `
      <p><a href="#/roles" style="text-decoration:none">← Back to Roles</a></p>
      <h2>Edit Role: ${esc(RN[rId] || rId)}</h2>
      <div class="card">
        <label>Role Name</label>
        <div style="display:flex; gap:12px">
          <input id="er_n" value="${esc(RN[rId] || "")}" style="flex:1">
          <button id="er_s">Update Name & Permissions</button>
        </div>
      </div>
      
      <div class="card" style="margin-top:16px; ${rId === 'su' ? 'display:none;' : ''}">
          <h3 style="margin-top:0; font-size:16px;">Edit Permissions</h3>
          <style>
            .perm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; }
            .perm-group { border: 1px solid var(--ln); padding: 16px; border-radius: 8px; }
            .perm-group h4 { margin: 0 0 12px 0; font-size: 14px; color: var(--ac); display: flex; align-items: center; gap: 6px; }
            .perm-item { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 14px; color: var(--mu); }
            .perm-item input[type="checkbox"] { width: 16px; height: 16px; margin: 0; cursor: pointer; accent-color: var(--gold); }
          </style>
          <div class="perm-grid" id="perm_body">
          </div>
      </div>

      <div class="card" style="margin-top:16px">
        <h3>Assign Users</h3>
        <p class="s">Change their assigned college/department or add new users to this role.</p>
        <div style="display:flex; gap:12px; margin-bottom:16px">
            <select id="er_add_u" style="flex:1">
              <option value="">Select an existing user to assign to this role...</option>
              ${S.users.filter(u => u.role !== rId).map(u => `<option value="${u.id}">${esc(u.name)} (Currently: ${RN[u.role] || "None"})</option>`).join("")}
            </select>
            <button id="er_add_b">Add to Role</button>
        </div>
        <div class="tw">
          <table>
            <tr>
              <th>Name</th>
              <th>College</th>
              ${rId === "dept" ? "<th>Department</th>" : ""}
              <th>Action</th>
            </tr>
            ${roleUsers.length ? roleUsers.map(u => `
              <tr>
                <td>${esc(u.name)}</td>
                <td>
                  ${rId === "su" ? "All Colleges" : `
                    <select onchange="window.updUCol('${u.id}', this.value)">
                      <option value="">Not assigned</option>
                      ${S.colleges.map(c => `<option value="${c.id}" ${u.college === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}
                    </select>
                  `}
                </td>
                ${rId === "dept" ? `
                  <td>
                    <select onchange="window.updUDep('${u.id}', this.value)">
                      <option value="">Not assigned</option>
                      ${S.depts.filter(d => d.college === u.college).map(d => `<option value="${d.id}" ${u.dept === d.id ? "selected" : ""}>${esc(d.name)}</option>`).join("")}
                    </select>
                  </td>
                ` : ""}
                <td>
                   <button class="r sm" onclick="if(confirm('Remove this user from ${esc(RN[rId])} role?')){ S.users.find(x=>x.id==='${u.id}').role = 'NONE'; save(); roles('edit', '${rId}'); }">Remove</button>
                </td>
              </tr>
            `).join("") : '<tr><td colspan="4" class="s">No users assigned to this role.</td></tr>'}
          </table>
        </div>
      </div>
    `;

    if (rId !== 'su') {
      const groups = [
        {
          icon: '🏛️', title: 'Colleges & Departments',
          items: [
            { mod: 'college', perm: 'view', label: 'View Colleges' },
            { mod: 'college', perm: 'create', label: 'Manage Colleges (Add/Edit)' },
            { mod: 'dept', perm: 'view', label: 'View Departments' },
            { mod: 'dept', perm: 'create', label: 'Manage Departments (Add/Edit)' }
          ]
        },
        {
          icon: '👥', title: 'User Management',
          items: [
            { mod: 'users', perm: 'view', label: 'View Users' },
            { mod: 'users', perm: 'create', label: 'Manage Users (Add/Edit)' },
            { mod: 'users', perm: 'delete', label: 'Delete Users' }
          ]
        },
        {
          icon: '📅', title: 'Event Reporting',
          items: [
            { mod: 'events', perm: 'view', label: 'View Events' },
            { mod: 'events', perm: 'create', label: 'Create & Edit Events' },
            { mod: 'events', perm: 'verify', label: 'Verify Event Completion' },
            { mod: 'events', perm: 'approve', label: 'Approve Events' }
          ]
        },
        {
          icon: '📊', title: 'Reports & Analytics',
          items: [
            { mod: 'reports', perm: 'view', label: 'View Monthly Reports' },
            { mod: 'reports', perm: 'submit', label: 'Submit Reports to University' },
            { mod: 'reports', perm: 'export', label: 'Analytics & Export Data (CSV)' }
          ]
        }
      ];

      let h = '';
      groups.forEach(g => {
        h += `<div class="perm-group"><h4><span style="font-size:18px; line-height:1">${g.icon}</span> ${g.title}</h4>`;
        g.items.forEach(c => {
          const isAllowed = allowed[c.mod] && allowed[c.mod].includes(c.perm);
          const isChecked = selected[c.mod] && selected[c.mod].includes(c.perm);
          h += `<label class="perm-item">`;
          h += `${isAllowed ? `<input type="checkbox" data-mod="${c.mod}" data-perm="${c.perm}" ${isChecked ? 'checked' : ''}>` : `<input type="checkbox" disabled>`}`;
          h += ` ${c.label}</label>`;
        });
        h += `</div>`;
      });
      $("#perm_body").innerHTML = h;

      document.querySelectorAll("#perm_body input[type=checkbox]").forEach(cb => {
        cb.onchange = (e) => {
          const { mod, perm } = e.target.dataset;
          if (!selected[mod]) selected[mod] = [];
          if (e.target.checked) {
            if (!selected[mod].includes(perm)) selected[mod].push(perm);
          } else {
            selected[mod] = selected[mod].filter(x => x !== perm);
          }
        };
      });
    }

    $("#er_s").onclick = () => {
      const nn = $("#er_n").value.trim();
      if (!nn) return alert("Role name required.");
      S.RN[rId] = nn;
      if (rId !== 'su') {
        if (!S.customRoles) S.customRoles = {};
        if (!S.customRoles[rId]) S.customRoles[rId] = { desc: '', perms: {} };
        S.customRoles[rId].perms = selected;
      }
      save();
      alert("Role updated successfully!");
      route();
    };
    $("#er_add_b").onclick = () => {
      const uid = $("#er_add_u").value;
      if (!uid) return;
      const u = S.users.find(x => x.id === uid);
      if (u) {
        u.role = rId;
        if (rId === 'su') { u.college = null; u.dept = null; }
        if (rId === 'ca' || rId === 'dean') { u.dept = null; }
        save(); roles('edit', rId);
      }
    };
    window.updUCol = (uid, cid) => { const u = S.users.find(x => x.id === uid); if (u) { u.college = cid || null; u.dept = null; save(); roles('edit', rId); } };
    window.updUDep = (uid, did) => { const u = S.users.find(x => x.id === uid); if (u) { u.dept = did || null; save(); roles('edit', rId); } };
    return;
  }

  if (a === "create") {
    $("#app").innerHTML = `
      <p><a href="#/roles" style="text-decoration:none">← Back to Roles</a></p>
      <h2>Create Role</h2>
      <p class="s">Select the features this role can access and what they can do.</p>
      
      <div class="row" style="margin-bottom:24px">
        <div style="flex:1">
          <label>Role Name <span class="rq">*</span></label>
          <input id="cr_name" placeholder="e.g. Event Approver">
        </div>
        <div style="flex:2">
          <label>Description (Optional)</label>
          <input id="cr_desc" placeholder="e.g. Can verify and approve events, and view reports.">
        </div>
      </div>

      <div style="display:flex; gap:24px; align-items:flex-start; flex-wrap:wrap">
        <div class="card" style="flex:2; min-width:300px; margin:0; padding:24px;">
          <h3 style="margin-top:0; font-size:16px;">Select Permissions</h3>
          <style>
            .perm-table { width: 100%; border-collapse: collapse; margin-top:16px; }
             .perm-table th { text-align: center; padding: 12px 8px; font-size: 13px; font-weight: 600; color: var(--ac); border-bottom: 1px solid var(--ln); }
            .perm-table th:first-child { text-align: left; }
             .perm-table td { text-align: center; padding: 12px 8px; border-bottom: 1px solid var(--ln); }
             .perm-table td:first-child { text-align: left; font-weight: 500; font-size: 14px; color: var(--tx); display:flex; align-items:center; gap:8px;}
             .perm-table input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: var(--gold); margin:0; }
            .perm-table input[type="checkbox"]:disabled { opacity: 0.3; cursor: not-allowed; }
          </style>
          <div style="overflow-x:auto;">
            <table class="perm-table">
              <thead>
                <tr>
                  <th>Module / Feature</th>
                  <th>View</th>
                  <th>Create</th>
                  <th>Edit</th>
                  <th>Delete</th>
                  <th>Verify</th>
                  <th>Approve</th>
                  <th>Export</th>
                  <th>Submit</th>
                </tr>
              </thead>
              <tbody id="perm_body">
                <!-- rendered by js -->
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="card" style="flex:1; min-width:260px; margin:0; background:var(--card); border:1px solid var(--ln); position:sticky; top:24px;">
          <h3 style="margin-top:0; font-size:16px;">Role Summary</h3>
          <div style="margin-top:16px; margin-bottom:12px; display:flex; gap:12px; align-items:flex-start">
             <div style="color:var(--mu); width:20px; text-align:center">👤</div>
             <div><div style="font-size:12px; color:var(--mu)">Name</div><div id="sum_name" style="font-weight:500; font-size:14px; margin-top:2px">Event Approver</div></div>
          </div>
          <div style="margin-bottom:12px; display:flex; gap:12px; align-items:flex-start">
             <div style="color:var(--mu); width:20px; text-align:center">🛡️</div>
             <div><div style="font-size:12px; color:var(--mu)">Type</div><div style="font-weight:500; font-size:14px; margin-top:2px">Custom Role</div></div>
          </div>
          <div style="margin-bottom:16px; display:flex; gap:12px; align-items:flex-start">
             <div style="color:var(--mu); width:20px; text-align:center">🕒</div>
             <div><div style="font-size:12px; color:var(--mu)">Description</div><div id="sum_desc" style="font-size:13px; line-height:1.4; margin-top:2px">Can verify and approve events, and view reports.</div></div>
          </div>
          <div style="border-top:1px solid var(--ln); padding-top:16px">
            <div style="font-weight:600; font-size:13px; margin-bottom:12px; color:var(--tx)">Selected Permissions</div>
            <div id="sum_perms" style="display:flex; flex-wrap:wrap; gap:8px;">
               <!-- rendered by js -->
            </div>
          </div>
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px; max-width: 100%">
         <a href="#/roles" style="text-decoration:none"><button class="g" style="padding:10px 24px;">Cancel</button></a>
         <button id="cr_submit" style="padding:10px 24px;">Create Role</button>
      </div>
    `;

    const modules = [
      { id: 'college', name: 'College', icon: '🏛️' },
      { id: 'dept', name: 'Department', icon: '🏢' },
      { id: 'users', name: 'Users', icon: '👥' },
      { id: 'events', name: 'Events', icon: '📅' },
      { id: 'reports', name: 'Reports', icon: '📊' },
    ];

    // Available checkboxes per row based on screenshot
    const allowed = {
      college: ['view', 'create', 'edit', 'delete'],
      dept: ['view', 'create', 'edit', 'delete'],
      users: ['view', 'create', 'delete'],
      events: ['view', 'create', 'edit', 'delete', 'verify', 'approve'],
      reports: ['view', 'export', 'submit']
    };

    // Pre-selected default checkboxes (to match screenshot exactly if we want)
    let selected = {
      college: ['view'],
      dept: ['view'],
      users: ['view'],
      events: ['view', 'create', 'edit', 'verify', 'approve'],
      reports: ['view', 'export']
    };

    const renderTable = () => {
      const cols = ['view', 'create', 'edit', 'delete', 'verify', 'approve', 'export', 'submit'];
      let h = '';
      modules.forEach(m => {
        h += '<tr>';
        h += `<td><span style="font-size:18px; line-height:1">${m.icon}</span> ${m.name}</td>`;
        cols.forEach(c => {
          const isAllowed = allowed[m.id].includes(c);
          const isChecked = selected[m.id].includes(c);
          h += `<td>${isAllowed ? `<input type="checkbox" data-mod="${m.id}" data-perm="${c}" ${isChecked ? 'checked' : ''}>` : `<input type="checkbox" disabled>`}</td>`;
        });
        h += '</tr>';
      });
      $("#perm_body").innerHTML = h;

      document.querySelectorAll("#perm_body input[type=checkbox]").forEach(cb => {
        cb.onchange = (e) => {
          const { mod, perm } = e.target.dataset;
          if (e.target.checked) {
            if (!selected[mod].includes(perm)) selected[mod].push(perm);
          } else {
            selected[mod] = selected[mod].filter(x => x !== perm);
          }
          updateSummary();
        };
      });
    };

    const updateSummary = () => {
      const n = $("#cr_name").value.trim() || 'Event Approver';
      const d = $("#cr_desc").value.trim() || 'Can verify and approve events, and view reports.';
      $("#sum_name").innerText = n;
      $("#sum_desc").innerText = d;

      let ph = '';
      modules.forEach(m => {
        selected[m.id].forEach(p => {
          ph += `<span style="background:var(--ac2); color:var(--ac); padding:4px 12px; border:1px solid var(--ln); border-radius:12px; font-size:12px; font-weight:600;">${m.name} ${p.charAt(0).toUpperCase() + p.slice(1)}</span>`;
        });
      });
      $("#sum_perms").innerHTML = ph || '<span class="s">No permissions selected</span>';
    };

    $("#cr_name").oninput = updateSummary;
    $("#cr_desc").oninput = updateSummary;

    renderTable();
    updateSummary();

    $("#cr_submit").onclick = () => {
      const n = $("#cr_name").value.trim();
      if (!n) return alert("Role name required.");
      const newRoleId = "r_" + uid();
      S.RN[newRoleId] = n;
      if (!S.customRoles) S.customRoles = {};
      S.customRoles[newRoleId] = {
        desc: $("#cr_desc").value.trim(),
        perms: selected
      };
      save();
      location.hash = "#/roles";
      route();
    };
    return;
  }

  const rolesList = [
    { id: "su", name: RN.su },
    { id: "ca", name: RN.ca },
    { id: "dean", name: RN.dean },
    { id: "dept", name: RN.dept }
  ];
  if (S.customRoles) {
    Object.keys(S.customRoles).forEach(k => {
      if (!["su", "ca", "dean", "dept"].includes(k)) {
        rolesList.push({ id: k, name: RN[k] || "Custom Role" });
      }
    });
  }

  const avGroup = (items, isCol) => {
    if (!items || !items.length) return `<span class="s" style="font-size:13px; color:var(--mu);">None</span>`;
    if (items === "ALL") return isCol ? `<span style="display:inline-block; padding:4px 10px; background:var(--ac); color:var(--on-dark); border-radius:12px; font-size:12px; font-weight:600;">All Colleges</span>` : `<div style="width:32px; height:32px; border-radius:50%; background:var(--ac); color:var(--on-dark); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; border:2px solid var(--gold-light); box-shadow:0 1px 3px rgba(12,26,46,0.16);">ALL</div>`;

    let h = `<div style="display:flex; align-items:center; flex-wrap:wrap; gap:6px;">`;
    const colors = isCol ? ["var(--maroon)", "var(--ac)", "var(--ok)", "var(--er)", "var(--navy-deep)"] : ["var(--ac)", "var(--maroon)", "var(--ok)", "var(--er)", "var(--navy-deep)"];
    const show = items.slice(0, 4);
    show.forEach((item, i) => {
      const color = colors[i % colors.length];
      if (isCol) {
        h += `<span style="background:${color}; color:var(--on-dark); padding:4px 10px; border-radius:12px; font-size:12px; font-weight:600; white-space:nowrap; box-shadow:0 1px 2px rgba(12,26,46,0.15);">${esc(item.name)}</span>`;
      } else {
        const initials = item.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
        h += `<div style="width:32px; height:32px; border-radius:50%; background:${color}; color:var(--on-dark); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:bold; border:2px solid var(--card); box-shadow:0 1px 2px rgba(12,26,46,0.15); margin-right:-8px; position:relative; z-index:${10 - i}" title="${esc(item.name)}">${esc(initials)}</div>`;
      }
    });
    if (items.length > 4) {
      h += `<div style="margin-left:${isCol ? '0' : '16px'}; font-size:13px; font-weight:500; color:var(--mu)">+${items.length - 4}</div>`;
    }
    h += `</div>`;
    return h;
  };

  let rows = rolesList.map(r => {
    const roleUsers = S.users.filter(u => u.role === r.id && (u.role !== 'su' || isSU()));
    const roleCols = r.id === "su" ? "ALL" : [...new Set(roleUsers.map(u => u.college).filter(Boolean))].map(cid => S.colleges.find(c => c.id === cid)).filter(Boolean);

    return `
      <tr style="border-bottom: 1px solid var(--ln);">
        <td style="padding:20px 12px; font-weight:500; color:var(--tx); font-size:15px">${r.name}</td>
       <td style="padding:20px 12px;">${avGroup(roleCols, true)}</td>
       <td style="padding:20px 12px;">${avGroup(roleUsers, false)}</td>
       <td style="padding:20px 12px; text-align:right; white-space:nowrap;">
          <a href="#/roles/edit/${r.id}"><button class="g sm" style="padding:8px 20px; font-weight:600; font-size:13px; border-radius:6px; box-shadow:none;">Edit</button></a>
          <span style="display:inline-block; margin-left:16px; margin-right:8px; cursor:pointer; color:var(--mu); font-weight:bold; letter-spacing:2px; vertical-align:middle; font-size:20px; line-height:1;">⋮</span>
       </td>
     </tr>
     `;
  }).join("");

  $("#app").innerHTML = `
    <style>
       .role-table { width: 100%; border-collapse: collapse; margin-top: 24px; background: var(--card); border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(12,26,46,0.08); border: 1px solid var(--ln); }
       .role-table th { text-align: left; padding: 16px 12px; font-size: 11px; font-weight: 700; color: var(--ac); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--gold-light); background: var(--ac2); }
    </style>
    <div style="display:flex; justify-content:space-between; align-items:center;">
       <div>
         <h2 style="margin:0">Roles</h2>
         <p class="s" style="margin-top:4px; margin-bottom:0">Manage role permissions and visibility across the system.</p>
       </div>
       <a href="#/roles/create" style="text-decoration:none"><button style="padding:10px 20px">+ Create Role</button></a>
    </div>
    
    <table class="role-table">
      <thead>
        <tr>
          <th style="width:30%; padding-left:12px;">ROLE</th>
          <th style="width:30%">COLLEGES</th>
          <th style="width:30%">USERS</th>
          <th style="width:10%; text-align:right; padding-right:24px;"></th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}
function users(action, id) {
  const gl = isGlobal();
  const canCre = gl || hasPerm('users', 'create');

  if (action === "assign" && id) {
    let department = S.depts.find(d => d.id === id);
    if (!department && id) {
      department = S.depts.find(d => (d.name || "").toLowerCase() === id.toLowerCase() || (d.code || "").toLowerCase() === id.toLowerCase());
    }
    if (!department || !(gl || (U.role === "ca" && U.college === department.college))) return route();
    const candidates = S.users.filter(u => u.role === "dept" && (u.college === department.college || (gl && !u.college)));
    const assigned = candidates.filter(u => u.dept === id || u.dept === department.id);
    $("#app").innerHTML = `<p><a href="#/depts/college/${department.college}">← Back to Departments</a></p><h2>Assign login user</h2><p class="s">${esc(department.name)} · ${esc(cn(department.college))}</p><p>${assigned.length} / 2 Department Users assigned${assigned.length ? ": " + assigned.map(u => esc(u.name)).join(", ") : ""}</p>${assigned.length ? `<div class="assignment-form"><label for="reminder_user">Daily report-reminder recipient</label><select id="reminder_user">${assigned.map(u => `<option value="${u.id}" ${department.reminderUserId === u.id ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select><button class="g" id="reminder_save">Save reminder recipient</button></div>` : ""}<div class="card assignment-form"><h3 style="margin:0 0 8px">Create &amp; assign new Department User</h3><label for="na_name">User name</label><input id="na_name" maxlength="100" placeholder="Full name"><label for="na_email">Email ID</label><input id="na_email" type="email" maxlength="255" placeholder="name@example.com"><label for="na_dept">Department</label><input id="na_dept" value="${esc(department.name)}" disabled style="background:#F5F5F5;font-weight:600"><button id="na_save">Create user &amp; send invitation</button><p class="s">The user can only open the dashboard of the selected department. An invitation email with the website link is sent to set a password.</p></div><div class="card assignment-form"><h3 style="margin:0 0 8px">Or assign an existing user</h3><label for="assign_user">Department user</label><select id="assign_user"><option value="">Select user</option>${candidates.map(u => `<option value="${u.id}">${esc(u.name)}${u.dept ? " · " + esc(dn(u.dept)) : " · Not assigned"}</option>`).join("")}</select><button id="assign_save" ${candidates.length ? "" : "disabled"}>Save assignment</button>${candidates.length ? "" : '<p class="s">No existing Department User accounts available — create one above.</p>'}</div>`;
    $("#na_save").onclick = async () => {
      const n = $("#na_name").value.trim(), e = $("#na_email").value.trim().toLowerCase();
      const dep = department;
      if (!n || n.length > 100) return alert("Enter the user name.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 255) return alert("Enter a valid email ID.");
      if (S.users.some(u => (u.email || "").toLowerCase() === e)) return alert("A user with this email already exists. Use 'Assign an existing user' instead.");
      if (S.users.filter(u => u.role === "dept" && (u.dept === dep.id || u.dept === department.id)).length >= 2) return alert("This department already has two Department Users.");
      const b = $("#na_save"); b.disabled = true; b.textContent = "Creating…";
      S.users.push({ id: uid(), name: n, role: "dept", college: dep.college, dept: dep.id, email: e, pending: true });
      await save();
      const ok = S.users.find(u => (u.email || "").toLowerCase() === e && (u.dept === dep.id || u.college === dep.college || (department && (u.dept === department.id || u.college === department.college))));
      if (!ok) { route(); return alert("The user could not be created. Please try again."); }
      alert(`${n} was assigned to ${dep.name} and an invitation email was sent to ${e}.`);
      location.hash = "#/depts/college/" + department.college; route();
    };
    if ($("#reminder_save")) $("#reminder_save").onclick = async () => { department.reminderUserId = $("#reminder_user").value; $("#reminder_save").disabled = true; await save(); route() };
    $("#assign_save").onclick = async () => {
      const user = candidates.find(u => u.id === $("#assign_user").value);
      if (!user) return alert("Select a user.");
      if (user.dept !== id && user.dept !== department.id && assigned.length >= 2) return alert("This department already has two Department Users.");
      if (user.dept && user.dept !== id && user.dept !== department.id && !confirm(`Move ${user.name} from ${dn(user.dept)} to ${department.name}?`)) return;
      const button = $("#assign_save"); button.disabled = true; button.textContent = "Saving…";
      user.college = department.college; user.dept = department.id;
      await save();
      const saved = S.users.find(u => u.id === user.id);
      if (!saved || (saved.dept !== id && saved.dept !== department.id) || (saved.college !== department.college && saved.college !== dep.college)) { route(); return alert("Assignment was not saved. Please try again."); }
      location.hash = "#/depts/college/" + department.college;
      route();
    };
    return;
  }

  if (action === "edit" && id) {
    const u = S.users.find(x => x.id === id);
    if (!u) return route();
    const canEdit = gl || isSU() || ((hasPerm('users', 'edit') || U.role === 'ca') && u.college === U.college && !['su', 'ca', 'dean'].includes(u.role));
    if (!canEdit) return route();

    $("#app").innerHTML = `
      <p><a href="#/users" style="text-decoration:none">← Back to Users</a></p>
      <h2>Edit User: ${esc(u.name)}</h2>
      <div class="card" style="max-width: 600px;">
         <div class="row">
           <div><label>Full name</label><input id="eu_n" value="${esc(u.name)}"></div>
           <div>
              <label>Role</label>
              <select id="eu_r" ${u.role === 'su' ? 'disabled' : ''}>
                 ${u.role === 'su' ? `<option value="su" selected>${esc(RN.su)}</option>` : `${gl ? `<option value="ca" ${u.role === 'ca' ? 'selected' : ''}>${esc(RN.ca)}</option>
                 <option value="dean" ${u.role === 'dean' ? 'selected' : ''}>${esc(RN.dean)}</option>` : ``}
                 <option value="dept" ${u.role === 'dept' ? 'selected' : ''}>${esc(RN.dept)}</option>
                 ${Object.keys(S.customRoles || {}).filter(k => !['ca', 'dean', 'dept'].includes(k)).map(k => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${esc(RN[k] || k)}</option>`).join("")}`}

              </select>
           </div>
           <div id="eu_cw" ${gl ? "" : "hidden"}><label>College</label>
              <select id="eu_c">
                <option value="">None (University Admin)</option>
                ${S.colleges.map(c => `<option value="${c.id}" ${u.college === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join("")}
              </select>
           </div>
           <div id="eu_dw"><label>Department</label>
              <select id="eu_d"></select>
           </div>
           <div><label>Email</label><input id="eu_p" value="${esc(u.email || "")}" disabled></div>
         </div>
         <button id="eu_s" style="margin-top:16px">Save Changes</button>
      </div>
     `;

    const syncEU = () => {
      const r = $("#eu_r").value;
      const c = gl ? $("#eu_c").value : U.college;
      if ($("#eu_cw")) $("#eu_cw").hidden = !(gl && r !== "su");
      if ($("#eu_dw")) $("#eu_dw").hidden = (r !== "dept" && r !== "ca");
      if ($("#eu_d")) $("#eu_d").innerHTML = `<option value="">Not assigned</option>` +
        S.depts.filter(d => d.college === c).map(d => `<option value="${d.id}" ${u.dept === d.id ? "selected" : ""}>${esc(d.name)}</option>`).join("");
    };
    $("#eu_r").onchange = () => { if ($("#eu_c")) $("#eu_c").onchange = syncEU; syncEU(); };
    if ($("#eu_c")) $("#eu_c").onchange = syncEU;
    syncEU();

    $("#eu_s").onclick = async () => {
      const r = $("#eu_r").value, n = $("#eu_n").value.trim(), p = $("#eu_p").value,
        c = r === "su" ? null : (gl ? $("#eu_c").value : U.college),
        d = $("#eu_dw").hidden ? null : $("#eu_d").value;
      if (!n) return alert("Name required.");
      if (["ca", "dean", "dept"].includes(r) && !c) return alert("Select a college.");
      if (r === "dept" && !S.depts.some(x => x.id === d && x.college === c)) return alert("Select a department for this user.");

      u.name = n;
      u.role = r;
      u.college = c;
      u.dept = d;

      $("#eu_s").disabled = true;
      await save();
      location.hash = "#/users";
      route();
    };
    return;
  }

  const usersList = S.users.filter(u => (gl || u.college === U.college) && (u.role !== 'su' || isSU()));
  const rows = usersList.map(u => {
    const canDel = U.id !== u.id && (gl || hasPerm('users', 'delete'));
    const canEdit = gl || isSU() || ((hasPerm('users', 'edit') || U.role === 'ca') && u.college === U.college && !['su', 'ca', 'dean'].includes(u.role));
    const initials = u.name.substring(0, 2).toUpperCase();
    const badgeColor = u.role === "su" ? "var(--error-bg); color:var(--maroon)" : u.role === "ca" ? "var(--success-bg); color:var(--ok)" : "var(--ac2); color:var(--ac)";
    return `
      <tr style="border-bottom: 1px solid var(--ln);">
        <td style="padding:16px 12px; display:flex; align-items:center; gap:12px;">
           <div style="width:36px; height:36px; border-radius:50%; background:var(--ac); display:flex; align-items:center; justify-content:center; font-weight:bold; color:var(--on-dark); font-size:14px; flex-shrink:0;">${initials}</div>
           <div>
              <div style="font-weight:600; color:var(--tx); font-size:15px; margin-bottom:2px;">${esc(u.name)}</div>
              <div style="font-size:12px; color:var(--mu)">${esc(u.college ? cn(u.college) : "University Admin")} ${u.dept ? ' · ' + esc(dn(u.dept)) : ''}</div>
           </div>
        </td>
        <td style="padding:16px 12px;">
           <div style="display:flex; align-items:center; gap:6px;">
              <div style="width:8px; height:8px; border-radius:50%; background:${u.status === "pending" ? "var(--gold)" : u.status === "active" ? "var(--ok)" : "var(--mu)"};"></div>
              <span style="font-size:13px; color:var(--mu)">${u.status === "pending" ? "Pending activation" : u.status === "active" ? "Active" : "Unknown"}</span>
              ${u.status === "pending" && U.id !== u.id && (gl || U.role === "ca") ? `<button class="g sm" style="margin-left:6px" onclick="resendInv(this,'${u.id}')">Resend invite</button>` : ""}
           </div>
        </td>
        <td style="padding:16px 12px;">
           <span style="background:${badgeColor}; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:600; white-space:nowrap;">${esc(RN[u.role] || u.role)}</span>
        </td>
        <td style="padding:16px 12px; text-align:right;">
           ${canEdit ? `<a href="#/users/edit/${u.id}" style="text-decoration:none; color:var(--ac); font-weight:700; font-size:14px; margin-right:12px;">Edit</a>` : ''}
           ${canDel ? `<a href="javascript:void(0)" onclick="delUser('${u.id}')" style="text-decoration:none; color:var(--er); font-weight:700; font-size:14px;">Delete</a>` : ''}
        </td>
      </tr>
      `;
  }).join("");

  $("#app").innerHTML = `
  <h2>Users</h2>
  <p class="s">${gl ? "Create college admins, deans and other university admins." : "Create one login per department."}</p>
  
  ${canCre ? `<div class="card" style="margin-bottom:24px"><div class="row"><div><label>Full name *</label><input id="u_n"></div><div><label>Role *</label><select id="u_r">${gl ? `<option value="ca">${esc(RN.ca)}</option><option value="dean">${esc(RN.dean)}</option>` : ``}<option value="dept">${esc(RN.dept)}</option>${Object.keys(S.customRoles || {}).filter(k => !['ca', 'dean', 'dept'].includes(k)).map(k => `<option value="${k}">${esc(RN[k] || k)}</option>`).join("")}</select></div>
<div id="u_cw" ${gl ? "" : "hidden"}><label>College</label><select id="u_c"><option value="">Select College</option>${S.colleges.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div><div id="u_dw" hidden><label>Department</label><select id="u_d"><option value="">Select Department</option></select></div><div><label>Email ID *</label><input id="u_p" type="email" placeholder="name@acu.ac.in"></div></div><button id="u_g">Create user</button></div>` : ''}
  
  <div class="card" style="padding:0; overflow-x:auto;">
     <table style="width:100%; border-collapse:collapse; min-width:500px;">
        <thead>
           <tr style="border-bottom:2px solid var(--gold-light); background:var(--ac2);">
              <th style="padding:16px 12px; text-align:left; font-size:12px; color:var(--ac); text-transform:uppercase;">Name / Details</th>
              <th style="padding:16px 12px; text-align:left; font-size:12px; color:var(--ac); text-transform:uppercase;">Status</th>
              <th style="padding:16px 12px; text-align:left; font-size:12px; color:var(--ac); text-transform:uppercase;">Role</th>
              <th style="padding:16px 12px; text-align:right; font-size:12px; color:var(--ac); text-transform:uppercase;"></th>
           </tr>
        </thead>
        <tbody>
           ${rows || '<tr><td colspan="4" style="padding:24px; text-align:center; color:var(--mu);">No users found.</td></tr>'}
        </tbody>
     </table>
  </div>`;

  const sync = () => {
    const r = $("#u_r") ? $("#u_r").value : null;
    const c = gl ? ($("#u_c") ? $("#u_c").value : "") : U.college;
    if ($("#u_cw")) $("#u_cw").hidden = !(gl && r !== "su");
    if ($("#u_dw")) $("#u_dw").hidden = (r !== "dept" && r !== "ca");
    if ($("#u_d")) {
      if (!c && gl && r !== "su") {
        $("#u_d").innerHTML = `<option value="">Select College first</option>`;
      } else {
        const selCol = S.colleges.find(col => col.id === c || (col.code && col.code.toLowerCase() === (c || "").toLowerCase()) || (col.name && col.name.toLowerCase() === (c || "").toLowerCase()));
        const colId = selCol ? selCol.id.toLowerCase() : (c || "").toLowerCase();
        const colCode = selCol && selCol.code ? selCol.code.toLowerCase() : "";
        const colName = selCol && selCol.name ? selCol.name.toLowerCase() : "";
        const depts = S.depts.filter(d => {
          const dc = (d.college || d.college_id || "").toLowerCase();
          return dc === colId || (colCode && dc === colCode) || (colName && dc === colName);
        });
        const prevVal = $("#u_d").value;
        $("#u_d").innerHTML = `<option value="">Select Department</option>` +
          depts.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join("");
        if (prevVal && depts.some(d => d.id === prevVal)) {
          $("#u_d").value = prevVal;
        }
      }
    }
  };
  if ($("#u_r")) {
    $("#u_r").onchange = sync;
    if ($("#u_c")) $("#u_c").onchange = sync;
    sync();
  }
  if ($("#u_g")) $("#u_g").onclick = async () => {
    const r = $("#u_r").value, n = $("#u_n").value.trim(), p = $("#u_p").value,
      c = (r === "su") ? null : (gl ? ($("#u_c") ? $("#u_c").value : null) : U.college),
      d = ($("#u_dw") && !$("#u_dw").hidden) ? $("#u_d").value : null;
    if (!n || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p)) return alert("Name and a valid email are required.");
    if (["ca", "dean", "dept"].includes(r) && !c) return alert("Select a college.");
    if (r === "dept" && !d) return alert("Select a department.");
    if (r === "dept" && c && d) {
      const selDept = S.depts.find(x => x.id === d);
      if (selDept) {
        const selCol = S.colleges.find(col => col.id === c || (col.code && col.code.toLowerCase() === c.toLowerCase()));
        const colId = selCol ? selCol.id.toLowerCase() : c.toLowerCase();
        const colCode = selCol && selCol.code ? selCol.code.toLowerCase() : "";
        const dc = (selDept.college || selDept.college_id || "").toLowerCase();
        if (dc !== colId && dc !== colCode && selDept.college !== c) {
          return alert(`Department "${selDept.name}" does not belong to the selected college.`);
        }
      }
    }
    const b = $("#u_g");
    b.disabled = true;
    b.textContent = "Creating…";
    S.users.push({ id: uid(), name: n, role: r, college: c, dept: d, email: p.trim().toLowerCase(), pending: true });
    await save();
    users();
  };
}

function fld(s, i, v) {
  const [l, t, r] = s.split("|"), id = "f" + i, x = v ?? ((EVCTX && EVCTX.pre[l]) || ""), d0 = myDepts()[0] || {}, lk = EVCTX && EVCTX.lock[l]; let c;
  if (lk && !["fu", "fp", "sec"].includes(t)) return `<div><label>${esc(l)}${r ? ' <span class="rq">*</span>' : ""} <span class="lg">(from approval)</span></label>${["lv", "md", "ps", "ty", "l2"].includes(t) ? `<select id="${id}" disabled><option>${esc(lk)}</option></select>` : `<input id="${id}" value="${esc(lk)}" disabled>`}</div>`;
  if (t === "sec") return `<div style="grid-column:1/-1"><h3 style="margin:14px 0 0">${esc(l)}</h3></div>`;
  if (t === "fu" || t === "fp") return `<div style="grid-column:1/-1"><label>${esc(l)}${r ? ' <span class="rq">*</span>' : ""}${t === "fp" ? " (images only)" : ""}</label><input type="file" id="${id}" multiple accept="${t === "fp" ? "image/*" : FA}"><div id="fl${i}" class="ph"></div></div>`;
  if (t === "ta") c = `<textarea id="${id}" rows="3">${esc(x)}</textarea>`;
  else if (t === "au") c = `<input id="${id}" value="${esc(cn(d0.college))}" disabled>`;
  else if (["lv", "md", "ps", "ty", "l2"].includes(t)) c = `<select id="${id}"><option value="">Select</option>${({ lv: LV, md: MD, ps: PS, ty: ET, l2: LV2 })[t].map(o => `<option ${o === x ? "selected" : ""}>${o}</option>`).join("")}</select>`;
  else c = `<input id="${id}" type="${t === "d" || t === "dn" ? "date" : t === "n" ? "number" : t === "l" ? "url" : "text"}" value="${esc(t === "dp" ? (v ?? d0.name ?? "") : t === "dn" ? (v || today()) : x)}" ${t === "l" ? 'placeholder="https://"' : ""}>`;
  return `<div ${t === "ta" ? 'style="grid-column:1/-1"' : ""}><label>${esc(l)}${r ? ' <span class="rq">*</span>' : ""}</label>${c}</div>`
}
function getF(F, scope = document, selectedFiles = FS) { const o = {}; FO = {}; for (let i = 0; i < F.length; i++) { const [l, t, r] = F[i].split("|"); if (t === "sec") continue; if (t === "fu" || t === "fp") { const a = selectedFiles[i] || []; if (r && !a.length) { alert(`"${l}" is mandatory: please upload at least one file.`); return null } if (t === "fp" && (a.length < 4 || a.length > 6)) { alert("Please upload 4 to 6 photographs."); return null } o[l] = a.length ? a.length + " file(s): " + a.map(x => x.name).join(", ") : ""; FO[l] = a; continue } const v = scope.querySelector("#f" + i).value.trim(); if (r && !v) { alert(`"${l}" is mandatory.`); return null } if (v && t === "n" && (isNaN(Number(v)) || Number(v) < 0)) { alert(`"${l}" must be a valid number (0 or more).`); return null } if (v && (t === "d" || t === "dn") && isNaN(new Date(v).getTime())) { alert(`"${l}" must be a valid date.`); return null } if (v && t === "l" && !/^https?:\/\/[^\s]+\.[^\s]+/.test(v)) { alert(`"${l}" must be a valid link starting with http:// or https://.`); return null } o[l] = v } return o }

const gateList = () => { const D = myDepts()[0]; const E = D ? S.events.filter(e => e.dept === D.id && ["PENDING", "DAPPROVED", "RETURNED", "APPROVED", "CRETURNED"].includes(e.status)) : []; return E.length ? `<div class="tw" style="margin-bottom:14px"><table><tr><th>Approval ID</th><th>Event</th><th>Status</th><th></th></tr>${[...E].reverse().map(e => `<tr><td><code>${esc(e.num)}</code></td><td>${esc(e.title)}</td><td>${badge(e.status)}</td><td>${["APPROVED", "CRETURNED"].includes(e.status) ? `<button class="sm" onclick="evOpen('${e.id}')">Use this Approval ID</button>` : e.status === "RETURNED" ? `<a href="#/events/edit/${e.id}"><button class="sm g">Correct form</button></a>` : "<small>Awaiting approval</small>"}</td></tr>`).join("")}</table></div>` : "" };
const gateHtml = () => `<div class="card"><h3>Event Organize is locked</h3><p class="lg"><b>No approval → no Event Organize.</b> Enter the Approval ID of an approved event. The college, department, faculty and event are taken from the approval automatically.</p><ol class="lg" style="margin:0 0 12px 18px"><li>Go to <b>Event reporting → + New event approval</b>, fill the approval form and submit it.</li><li>Once it has both approvals, copy its <b>Approval ID</b> (shown as the Form ref / Event ID).</li><li>Come back here, paste that Approval ID below, and the Events Organized report unlocks.</li></ol><div style="margin:0 0 14px"><a href="#/events/new"><button>Fill Event Approval Form</button></a></div>${gateList()}<div style="max-width:420px"><label>Approval ID</label><input id="g_id" placeholder="e.g. IQAC/BGS/DH/01/2026-27"></div><button id="g_go">Verify Approval ID</button><div id="g_out" style="margin-top:10px"></div></div>`;
const evBanner = e => `<div class="note"><b>Approval ID verified:</b> <code>${esc(e.num)}</code> ${badge(e.status)}<br>College: ${esc(cn((S.depts.find(d => d.id === e.dept) || {}).college))} · Department: ${esc(dn(e.dept))} · Faculty: ${esc(e.faculty || "—")}${e.conv ? " · Convener: " + esc(e.conv) : ""}<br>Event: ${esc(e.title)} · Approved dates: ${e.date}${e.dateTo ? " to " + e.dateTo : ""}<br>Fields marked "from approval" are locked. Reporting ${cyclePeriod()}: ${dateToM(e.date)}.${e.status === "CRETURNED" && e.remark ? `<br><b>Returned:</b> ${esc(e.remark)}` : ""}<br><button class="g sm" id="g_x">Use a different Approval ID</button></div>`;
function monthly(hk, rid) {
  if (rid === "article") { aiShow(); return }
  if (AIFORM && location.hash === AIFORM.hash) { const root = $("#app"); root.replaceChildren(...AIFORM.nodes); FS = AIFORM.files; AIFORM = null; return }
  const D = myDepts()[0]; if (!D) return $("#app").innerHTML = `<h2>${cycleName()} reporting</h2><div class="card"><h3>No department linked to this login</h3><p>The ${H.length} reporting headings appear once this account is linked to a department. Ask your College Admin to create the department under <b>Departments</b>, then link this user to it on the <b>Role</b> page (Assign Users).</p></div>`;
  if (!hk) { EVU = null; $("#app").innerHTML = `<h2>${cycleName()} reporting · ${esc(D.name)}</h2><p class="s">Report every one of the ${H.length} headings each ${cyclePeriod()}. If nothing happened, submit zero with a remark.</p>${mSel()}<div class="card" style="margin-top:12px;padding-top:12px"><div class="tw"><table class="table-hover v-mid"><tr><th class="w-1">#</th><th>Heading</th><th>Status</th><th class="text-right">Action</th></tr>${H.map((h, i) => { const s = hs(D.id, h[0]), c = S.recs.filter(x => x.dept === D.id && x.month === M && x.head === h[0]).length; return `<tr><td class="w-1" style="color:var(--mu)">${i + 1}</td><td><b style="font-weight:500;font-size:15px">${h[1]}</b></td><td>${s === "data" ? `<span class="b ok">Data entered (${c})</span>` : s === "zero" ? '<span class="b wa">Zero (0)</span>' : '<span class="b er">Not reported</span>'}</td><td class="text-right"><a href="#/monthly/${h[0]}"><button class="${s === "none" ? "sm" : "g sm"}">${s === "none" ? "Enter Data" : "View / Edit"}</button></a></td></tr>` }).join("")}</table></div></div>${deptDone(D) ? `<div class="note">All ${H.length} headings are reported for ${M}.</div>` : ""}`; return }
  const h = H.find(x => x[0] === hk), F = h[2], rs = S.recs.filter(x => x.dept === D.id && x.month === M && x.head === hk), z = S.zeros.find(x => x.dept === D.id && x.month === M && x.head === hk), vw = rid && rid.startsWith("v_"), CI = (h[3] || [0, 1, 2, 3]).filter(i => i < F.length).map(i => F[i]), EVG = hk === "evo", fe = EVG ? evUnlocked(D) : null, ed = (EVG ? (fe && fe.recId && S.recs.find(r => r.id === fe.recId)) : (rid && !vw && rs.find(x => x.id === rid))) || null;
  if (vw) {
    const r = rs.find(x => x.id === rid.slice(2)); if (!r) return monthly(hk); const rows = repRows(h, r);
    $("#app").innerHTML = `<p class="noprint"><a href="#/monthly/${hk}">← Back to ${h[1]}</a></p><h2 style="text-align:center;margin-bottom:0">Adichunchanagiri University</h2>${h[5] ? `<p style="text-align:center;margin:0 0 12px">${h[5]}</p>` : `<p style="text-align:center;margin:0 0 12px">${h[1]}</p>`}<div class="tw"><table><tr><th>Sl. No.</th><th>Particulars</th><th>Details / Information</th></tr>${rows}</table></div>${h[4] ? `<h3 style="margin-top:16px">Submission Guidelines</h3><ul class="lg">${h[4].map(g => `<li>${esc(g)}</li>`).join("")}</ul>` : ""}<div class="noprint"><button onclick="print()">Print report</button></div>`; hydrate($("#app")); return
  }
  $("#app").innerHTML = `<p><a href="#/monthly">← All headings</a></p><h2>${h[1]} · ${M}</h2><p class="s">${esc(D.name)}</p>
${z ? `<div class="card"><span class="b wa">Zero submitted</span> ${esc(z.remarks || "")}<br><button class="g sm" id="uz">Withdraw zero to enter data</button></div>` : ""}
${z ? "" : EVG && !fe ? gateHtml() : `<div class="card"><h3>${ed ? "Edit record" : EVG ? "Event Organize report" : "Activity done: add a record"}</h3>${EVG ? evBanner(fe) : ""}${h[5] ? `<p class="lg">${h[5]}</p>` : ""}${h[4] ? `<div class="note"><b>Submission guidelines</b><ul style="margin:6px 0 0;padding-left:18px">${h[4].map(g => `<li>${esc(g)}</li>`).join("")}</ul></div>` : ""}<div class="row">${(EVCTX = fe ? evAuto(fe) : null, "")}${F.map((s, i) => fld(s, i, ed && ed.data[s.split("|")[0]])).join("")}${(EVCTX = null, "")}</div>${EVG ? "" : `<button id="sv">${ed ? "Save changes" : "Save record"}</button>`}${ed && !EVG ? ` <a href="#/monthly/${hk}"><button class="g">Cancel</button></a>` : ""}${hk === "evo" ? aiBox() : ""}</div>`}
${rs.length ? `<div class="card"><h3>Records this ${cyclePeriod()} (${rs.length})</h3><div class="tw"><table><tr>${EVG ? "<th>Approval ID</th>" : ""}${CI.map(s => `<th>${esc(s.split("|")[0])}</th>`).join("")}<th></th></tr>${rs.map(r => `<tr>${EVG ? `<td><code>${esc(r.evNum || "No Approval ID (legacy)")}</code></td>` : ""}${CI.map(s => `<td>${esc(r.data[s.split("|")[0]] || "—")}</td>`).join("")}<td><a href="#/monthly/${hk}/v_${r.id}"><button class="g sm">View / print</button></a>${EVG && r.article ? `<button class="g sm" onclick="aiStored('${r.id}')">View article / PDF</button>` : ""}${EVG && r.evId ? (["CRETURNED", "SUBMITTED"].includes((S.events.find(x => x.id === r.evId) || {}).status) ? `<button class="g sm" onclick="evOpen('${r.evId}')">Edit and resubmit</button>` : "") : `${EVG ? "" : `<a href="#/monthly/${hk}/${r.id}"><button class="g sm">Edit</button></a>`}<button class="r sm" onclick="delRec('${r.id}','${hk}')">Delete</button>`}</td></tr>`).join("")}</table></div></div>` : ""}
${!rs.length && !z ? `<div class="card"><h3>No activity this ${cyclePeriod()}</h3><label>Remarks (optional)</label><input id="zr" placeholder="e.g. no activity during this ${cyclePeriod()}"><button class="g" id="sz">Submit zero (0)</button></div>` : ""}`;
  if ($("#ai_go")) { AIART = ed && ed.article || null; AIHEAD = hk; AIIMAGES = []; AIOWNER = window.__ACU.uid; $("#ai_go").onclick = () => aiRun(F, h, D); }
  AISUBMIT = null;
  if ($("#ai_go")) {
    wireF(F, ed);
    const form = $("#ai_go").closest(".card"), selectedFiles = FS;
    const submitReport = async () => {
      if (submitReport.busy) return; submitReport.busy = true;
      try { return await doSubmit() } finally { submitReport.busy = false }
    };
    const doSubmit = async () => {
      const d = getF(F, form, selectedFiles); if (!d) return; const files = {};
      try { for (const l in FO) { files[l] = []; for (const it of FO[l]) { if (it.blob) await fPut(it.id, { name: it.name, type: it.type, blob: it.blob }); files[l].push({ id: it.id, name: it.name, type: it.type, size: it.size }) } } } catch (e) { return alert("Could not store the files in this browser (storage may be full or blocked). Try fewer or smaller files.") }
      if (EVG) { const e2 = S.events.find(x => x.id === (fe && fe.id)); if (!e2 || e2.dept !== D.id || !["APPROVED", "CRETURNED", "SUBMITTED"].includes(e2.status)) return alert("This Approval ID is no longer valid for Event Organize.") }
      const rec = ed || { id: uid(), college: D.college, dept: D.id, month: EVG ? dateToM(fe.date) : M, head: hk, by: U.name, files: {}, data: {} };
      if (ed) { const keep = new Set(Object.values(files).flat().map(x => x.id)); Object.values(ed.files || {}).flat().forEach(x => { if (!keep.has(x.id)) fDel(x.id).catch(() => { }) }) }
      rec.data = d; rec.files = files; if (EVG && AIART && AIHEAD === "evo") rec.article = JSON.parse(JSON.stringify(AIART)); if (EVG) { rec.evId = fe.id; rec.evNum = fe.num } if (!ed) S.recs.push(rec);
      if (EVG) { fe.recId = rec.id; fe.status = "SUBMITTED"; fe.comp = { count: +(d["Number of Participants"] || 0), date: fe.date }; fe.hist.push([new Date().toISOString(), "Event Organize report " + (ed ? "resubmitted" : "submitted") + " by " + U.name]); EVU = null }
      await save(); AIFORM = null; AISUBMIT = null; location.hash = "#/monthly/" + hk; route(); return true
    };
    if (EVG) AISUBMIT = submitReport;
    else if ($("#sv")) $("#sv").onclick = submitReport;
  }
  if ($("#g_go")) $("#g_go").onclick = () => {
    const v = $("#g_id").value.trim().toUpperCase(), o = $("#g_out"); if (!v) return; const e = S.events.find(x => x.num.toUpperCase() === v && x.dept === D.id); if (!e) { o.innerHTML = '<div class="note er">Approval ID not found for your department.</div>'; return }
    const m = { PENDING: "This Approval ID is still awaiting College Dean approval.", DAPPROVED: "This Approval ID is awaiting University Admin final approval.", RETURNED: "This approval was returned for correction. Correct and resubmit the approval form first.", REJECTED: "This approval was rejected. Event Organize is not allowed.", SUBMITTED: "An Event Organize report is already submitted and awaiting verification.", COMPLETED: "This event is already completed and verified." }[e.status]; if (m) { o.innerHTML = `<div class="note er">${m}</div>`; return } EVU = e.id; setM(dateToM(e.date)); monthly("evo")
  };
  if ($("#g_x")) $("#g_x").onclick = () => { EVU = null; monthly("evo") }; hydrate($("#app"));
  if ($("#sz")) $("#sz").onclick = () => { S.zeros.push({ dept: D.id, month: M, head: hk, remarks: $("#zr").value.trim(), by: U.name }); save(); monthly(hk) };
  if ($("#uz")) $("#uz").onclick = () => { S.zeros = S.zeros.filter(x => x !== z); save(); monthly(hk) }
}
// ---- AI article generator for periodic reporting ----
let AIART = null, AIHEAD = null, AIIMAGES = [], AIFORM = null, AIORIGIN = "#/monthly", AIOWNER = null, AISUBMIT = null;
function aiBox() {
  return `<div class="ai-box" style="margin-top:20px;padding:16px;border:1px solid var(--ln);border-top:3px solid var(--gold-light);border-radius:10px;background:var(--surface)">
<h3 style="margin-top:0">AI Article Generator</h3>
<p class="lg" style="margin-top:0">Fill in the details above and upload the brochure / poster / photographs. The AI will analyse every field, the objectives and the attachments, and write a complete professional article.</p>
<label>Notes for the writer (optional)</label><textarea id="ai_notes" rows="2" placeholder="e.g. highlight student participation and industry collaboration"></textarea>
<button id="ai_go" type="button">Generate AI article</button> <span id="ai_st" class="lg"></span>
<div id="ai_out"></div></div>`
}
function aiImg(blob) {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(blob), im = new Image();
    im.onload = () => { const m = 1600, k = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL("image/jpeg", 0.85)) };
    im.onerror = () => { URL.revokeObjectURL(u); rej(new Error("bad image")) };
    im.src = u
  })
}
const aiB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob) });
async function aiRun(F, h, D, origin) {
  const st = $("#ai_st"), btn = $("#ai_go"), out = $("#ai_out");
  const fields = {}, files = [];
  for (let i = 0; i < F.length; i++) {
    const [l, t] = F[i].split("|"); if (t === "sec") continue;
    if (t === "fu" || t === "fp") { for (const it of (FS[i] || [])) files.push({ ...it, label: l, prio: /brochure|poster|invitation|flyer|banner/i.test(l + " " + it.name) ? 0 : t === "fp" ? 2 : 1 }); continue }
    const el = $("#f" + i); if (el && el.value.trim()) fields[l] = el.value.trim()
  }
  if (Object.keys(fields).length < 2) return alert("Please fill in the report details first, then generate the article.");
  btn.disabled = true; out.innerHTML = ""; st.textContent = "Reading attachments…";
  try {
    const sel = files.filter(f => /^image\//.test(f.type || "") || /pdf/.test(f.type || "") || /\.pdf$/i.test(f.name)).sort((a, b) => a.prio - b.prio), payload = [];
    if (sel.length > 10) throw new Error("Please use at most 10 image or PDF attachments per article. No attachments have been analysed yet.");
    for (const f of sel) {
      try {
        let blob = f.blob; if (!blob) { const g = await window.__ACU.fGet(f.id); blob = g && g.blob } if (!blob) throw new Error("Attachment unavailable");
        const pdf = /pdf/.test(f.type || blob.type || "") || /\.pdf$/i.test(f.name);
        if (pdf && blob.size > 8e6) throw new Error("PDF exceeds 8 MB");
        payload.push({ name: f.name, label: f.label, kind: pdf ? "pdf" : "image", data: pdf ? await aiB64(blob) : await aiImg(blob) })
      } catch (e) { throw new Error(`Could not read "${f.name}". Please upload it again (PDFs must be under 8 MB).`) }
    }
    st.textContent = `Analysing ${Object.keys(fields).length} details and ${payload.length} attachment(s) and writing the article… this can take a minute.`;
    const r = await window.__ACU.generateReportArticle({ heading: h[1], department: D.name, period: M, fields, notes: $("#ai_notes").value.trim(), files: payload });
    AIART = r.article; AIHEAD = h[0]; AIIMAGES = payload.filter(f => f.kind === "image"); AIOWNER = window.__ACU.uid; st.textContent = "";
    AIORIGIN = origin || location.hash; AIFORM = { hash: AIORIGIN, nodes: Array.from($("#app").childNodes), files: FS, submit: AISUBMIT, resubmission: !!(AIHEAD === "evo" && EVU && S.events.find(e => e.id === EVU)?.recId), regenerate: () => aiRun(F, h, D, AIORIGIN) };
    location.hash = `#/monthly/${h[0]}/article`;
    if (origin) aiShow();
  } catch (e) { st.textContent = ""; out.innerHTML = `<div class="note er">${esc((e && e.message) || "Article generation failed.")}</div>` }
  finally { btn.disabled = false }
}
function aiText(a) { return a.title + "\n\n" + a.summary + "\n\n" + a.sections.map(s => s.heading + "\n\n" + s.content).join("\n\n") + (a.keyHighlights.length ? "\n\nKey Highlights\n" + a.keyHighlights.map(x => "• " + x).join("\n") : "") }
function aiShow() {
  const root = $("#app");
  if (!AIART || AIOWNER !== window.__ACU.uid) { root.innerHTML = '<h2>Article unavailable</h2><p><a href="#/monthly">← Back to reporting</a></p>'; return }
  const a = AIART, eventOrganize = AIHEAD === "evo", p = t => esc(t).split(/\n\s*\n/).map(x => `<p>${x.replace(/\n/g, "<br>")}</p>`).join("");
  root.innerHTML = `<p class="noprint"><a href="${esc(AIORIGIN)}">← Back to report</a></p><div class="${eventOrganize ? "event-article-workspace" : ""}"><div class="noprint event-article-toolbar"><h3>${eventOrganize ? "Events Organized · Article" : "Generated article"}</h3><div class="event-article-actions">${eventOrganize ? `<button type="button" class="g" id="ai_edit">✎ Edit article</button>${AIFORM ? `<button type="button" class="g" id="ai_regen">↻ Re-Generate AI article</button>` : ""}` : ""}</div></div><div id="ai_editor" class="event-article-editor" hidden></div><article id="ai_art" class="event-article-paper">
<h2 style="margin-top:0">${esc(a.title)}</h2><p><i>${esc(a.summary)}</i></p>${a.sections.map(s => `<h3>${esc(s.heading)}</h3>${p(s.content)}`).join("")}
 ${a.keyHighlights.length ? `<h3>Key Highlights</h3><ul>${a.keyHighlights.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}<h3>Photos / Attachments</h3>${AIIMAGES.length ? `<div style="display:flex;flex-wrap:wrap;gap:16px">${AIIMAGES.map(f => `<figure style="margin:0;width:220px"><img src="${esc(f.data)}" alt="${esc(f.label + ': ' + f.name)}" style="display:block;width:100%;height:160px;object-fit:cover;border-radius:8px;border:1px solid var(--ln)"><figcaption class="s" style="margin-top:6px;font-size:14px;text-align:center">${esc(f.label)} · ${esc(f.name)}</figcaption></figure>`).join("")}</div>` : `<p class="s">No images / photos</p>`}</article>${eventOrganize ? `<div id="ai_pages" class="event-letterhead-pages" aria-label="Article pages"></div>` : ""}
<div class="noprint event-article-actions" style="margin-top:12px"><button type="button" class="g" id="ai_dl">Download (PDF)</button> <button type="button" class="g" id="ai_pr">Print</button>${AIFORM && AIFORM.submit ? ` <button type="button" id="ai_submit">${AIFORM.resubmission ? "Resubmit Event Organize report" : "Submit Event Organize report"}</button>` : ""}</div></div>`;
  if (eventOrganize && window.__ACU_PDF) window.__ACU_PDF.renderEl($("#ai_art"), $("#ai_pages")).catch(() => { $("#ai_pages")?.replaceChildren(); });
  if ($("#ai_edit")) $("#ai_edit").onclick = () => {
    const editor = $("#ai_editor"); editor.hidden = false; $("#ai_art").hidden = true; if ($("#ai_pages")) $("#ai_pages").hidden = true;
    editor.innerHTML = `<h3>Edit article</h3><label>Article title</label><input id="ae_title" value="${esc(a.title)}"><label>Summary</label><textarea id="ae_summary" rows="3">${esc(a.summary)}</textarea>${a.sections.map((section, i) => `<label>Section ${i + 1} heading</label><input id="ae_h${i}" value="${esc(section.heading)}"><label>Content</label><textarea id="ae_c${i}" rows="6">${esc(section.content)}</textarea>`).join("")}<label>Key highlights</label><textarea id="ae_highlights" rows="4">${esc(a.keyHighlights.join("\n"))}</textarea><div class="event-article-actions"><button id="ae_save">Save article changes</button><button class="g" id="ae_cancel">Cancel</button></div>`;
    $("#ae_cancel").onclick = aiShow;
    $("#ae_save").onclick = () => { if (!$("#ae_title").value.trim()) return alert("Article title is required."); AIART = { ...a, title: $("#ae_title").value.trim(), summary: $("#ae_summary").value.trim(), sections: a.sections.map((section, i) => ({ heading: $("#ae_h" + i).value.trim(), content: $("#ae_c" + i).value.trim() })), keyHighlights: $("#ae_highlights").value.split("\n").map(x => x.trim()).filter(Boolean) }; aiShow(); };
  };
  if ($("#ai_regen")) $("#ai_regen").onclick = () => {
    if (!AIFORM || !confirm("Replace this article with a new AI-generated article using the report details and uploads?")) return;
    const retained = AIFORM; $("#app").replaceChildren(...retained.nodes); FS = retained.files; AISUBMIT = retained.submit;
    retained.regenerate().finally(() => { if (AIFORM === retained) { alert($("#ai_out")?.textContent || "Regeneration failed. Your previous article is unchanged."); aiShow(); } });
  };
  const submitButton = $("#ai_submit"), submitReport = AIFORM && AIFORM.submit;
  if (submitButton && submitReport) submitButton.onclick = async () => {
    submitButton.disabled = true;
    try { await submitReport() }
    catch (e) { alert((e && e.message) || "Could not submit the report. Please try again.") }
    finally { submitButton.disabled = false }
  };
  $("#ai_dl").onclick = async () => { const el = $("#ai_art"), name = a.title.replace(/[^\w\- ]+/g, "").trim().slice(0, 60) || "article"; if (window.__ACU_PDF) { try { return await window.__ACU_PDF.toPdf(name, el, { eventOrganize }) } catch (e) { /* fall through to print fallback */ } } if (confirm("PDF could not be created directly. Open the print dialog and choose \"Save as PDF\"?")) window.__ACU_PDF ? window.__ACU_PDF.printEl(el, a.title, { eventOrganize }) : window.print() }
  $("#ai_pr").onclick = () => { window.__ACU_PDF ? window.__ACU_PDF.printEl($("#ai_art"), a.title, { eventOrganize }) : window.print() }
}
async function aiStored(id) {
  const record = S.recs.find(r => r.id === id && r.dept === myDepts()[0]?.id); if (!record || !record.article) return;
  const photos = [];
  try { for (const [label, files] of Object.entries(record.files || {})) for (const file of files) if (isImg(file)) { const stored = await fGet(file.id); if (!stored) throw new Error("Photo unavailable: " + file.name); photos.push({ name: file.name, label, data: await aiImg(stored.blob) }); } }
  catch (error) { return alert(error.message || "Could not load the report photographs."); }
  const event = S.events.find(e => e.id === record.evId);
  AIFORM = null;
  if (event && ["APPROVED", "SUBMITTED", "CRETURNED"].includes(event.status)) {
    EVU = event.id; setM(record.month); monthly("evo");
    const heading = H.find(h => h[0] === "evo"), department = myDepts()[0];
    AIFORM = { hash: "#/monthly/evo", nodes: Array.from($("#app").childNodes), files: FS, submit: AISUBMIT, resubmission: true, regenerate: () => aiRun(heading[2], heading, department, "#/monthly/evo") };
  }
  AIART = record.article; AIIMAGES = photos; AIHEAD = record.head; AIOWNER = window.__ACU.uid; AIORIGIN = "#/monthly/evo"; location.hash = "#/monthly/evo/article"; aiShow();
}
function delRec(id, hk) { if (confirm("Delete this record?")) { const r0 = S.recs.find(r => r.id === id); Object.values((r0 && r0.files) || {}).flat().forEach(f => fDel(f.id).catch(() => { })); S.recs = S.recs.filter(r => r.id !== id); save(); monthly(hk) } }

function events(a, id) {
  if (!workflowOn()) return workflowUnavailable();
  const isD = U.role === "dept" || hasPerm('events', 'create'), D = myDepts()[0], E = myEv();
  if (a === "new" || a === "edit") {
    if (!D) { $("#app").innerHTML = '<h2>Event approval form</h2><div class="note">No department is assigned to this account. Ask your administrator to assign a department before creating an approval.</div>'; return }
    const e = a === "edit" && S.events.find(x => x.id === id), g = k => esc(e && e[k] || ""), sp = e && e.speakers || [], TY = ["Seminar", "Conference", "Workshop", "Training", "Short Term Course", "FDP", "Special Lecture", "Sports", "Cultural", "Co-curricular", "Extra Curricular", "Other"], oth = e && !TY.includes(e.type);
    let myCfs = S.eventConfs.filter(x => x.college === D.college);
    if (myCfs.length === 0) { S.eventConfs.push({ id: uid(), p1: "IQAC", p2: "BGS", seq: "01", fy: getFinYear(), college: D.college }); save(); myCfs = S.eventConfs.filter(x => x.college === D.college); }
    // Each department keeps its own running number per format and financial year; a new department starts at 01.
    const getExpectedNum = (confId) => {
      const conf = myCfs.find(x => x.id === confId) || myCfs[0];
      const pre = `${conf.p1}/${conf.p2}/${D.code}/`; const suf = `/${getFinYear()}`;
      const used = S.events.filter(x => x.dept === D.id && typeof x.num === "string" && x.num.startsWith(pre) && x.num.endsWith(suf)).map(x => parseInt(x.num.slice(pre.length, x.num.length - suf.length), 10)).filter(n => !isNaN(n));
      const next = (used.length ? Math.max(...used) : 0) + 1;
      return `${pre}${String(next).padStart(2, "0")}${suf}`;
    };
    const expectedNum = e ? e.num : getExpectedNum(myCfs[0].id);
    $("#app").innerHTML = `<p class="noprint"><a href="#/events">← Event Reporting</a></p>${e && e.remark ? `<div class="note">Remark: ${esc(e.remark)}</div>` : ""}
${!e && myCfs.length > 1 ? `<div class="approval-format noprint"><label for="a_conf_sel">Event ID format <span class="rq">*</span></label><select id="a_conf_sel">${myCfs.map(c => `<option value="${esc(c.id)}">${esc(c.p1)}/${esc(c.p2)}/.../${esc(getFinYear())}</option>`).join("")}</select></div>` : ""}
${approvalPaper(e || {}, { editable: true, isNew: !e, department: D.name, reference: expectedNum, types: TY, other: oth })}
<div class="approval-actions noprint"><button id="a_g">${e ? "Resubmit for approval" : "Submit for approval"}</button><a href="#/events">Cancel</a></div>`;
    $("#a_y").onchange = () => $("#a_ow").hidden = $("#a_y").value !== "Other";
    if ($("#a_conf_sel")) $("#a_conf_sel").onchange = () => $("#e_ref").innerText = getExpectedNum($("#a_conf_sel").value);
    const dy = () => { const f = $("#a_fr").value, t = $("#a_to").value; if (f && t && t >= f) $("#a_dy").value = Math.round((new Date(t) - new Date(f)) / 864e5) + 1 }; $("#a_fr").onchange = $("#a_to").onchange = dy;
    $("#a_g").onclick = () => {
      const v = k => $("#" + k).value.trim(), ty = $("#a_y").value === "Other" ? v("a_ot") : $("#a_y").value, mo = (document.querySelector("input[name=a_m]:checked") || {}).value;
      if (!$("#a_y").value || !ty || !v("a_f") || !v("a_c") || !v("a_t") || !mo || !v("a_fr") || !v("a_to") || !v("a_v")) return alert("Proposed event, faculty, convener, topic, mode, dates and venue are mandatory.");
      if (v("a_to") < v("a_fr")) return alert("The 'To' date cannot be before the 'From' date.");
      if (!e && v("a_fr") < today()) return alert("The event 'From' date cannot be in the past.");
      if (v("a_cf") && (isNaN(+v("a_cf")) || +v("a_cf") < 0)) return alert("The proposed cost must be a valid amount (0 or more).");
      if (v("a_dy") && (isNaN(+v("a_dy")) || +v("a_dy") < 1)) return alert("The duration must be at least 1 day.");
      $("#a_g").disabled = true;
      const o = { type: ty, faculty: v("a_f"), assoc: v("a_as"), conv: v("a_c"), coconv: v("a_cc"), secy: v("a_sc"), speakers: [v("a_s1"), v("a_s2")], title: v("a_t"), mode: mo, date: v("a_fr"), dateTo: v("a_to"), days: v("a_dy"), venue: v("a_v"), costFig: v("a_cf"), costWords: v("a_cw"), status: "PENDING" };
      if (e) { Object.assign(e, o); e.hist.push([new Date().toISOString(), "Resubmitted"]) }
      else {
        const confId = $("#a_conf_sel") ? $("#a_conf_sel").value : myCfs[0].id;
        const conf = myCfs.find(x => x.id === confId) || myCfs[0];
        const num = getExpectedNum(confId);

        S.events.push({ id: uid(), num, dept: D.id, ...o, by: U.name, byEmail: U.email || "", submittedAt: new Date().toISOString(), hist: [[new Date().toISOString(), "Submitted for approval"]] })
      }
      save(); location.hash = "#/events"; route()
    }; return
  }
  if (a === "view") {
    const e = S.events.find(x => x.id === id); if (!e || !E.includes(e)) return $("#app").innerHTML = '<div class="card empty">Event not found in your scope.</div>'; const c = e.comp, d = S.depts.find(x => x.id === e.dept) || {};
    $("#app").innerHTML = `<p><a href="#/events">← Events</a></p><h2>Event master record</h2><div class="card"><code>${esc(e.num)}</code> ${badge(e.status)}<h3 style="margin:8px 0 0">${esc(e.title)}</h3><small>${esc(cn(d.college))} · ${esc(d.name)}</small></div>
${apForm(e)}<div class="approval-actions noprint"><button class="g" onclick="printApprovalForm()">Print approval form</button></div>
${articlePreview(e)}
<div class="card"><h3>Event Organize report</h3>${orgRec(e) || c ? repBlock(e) : '<div class="empty">Not filed yet. It unlocks only after Dean / Principal approval.</div>'}</div>
<div class="card"><h3>Approval history</h3>${(e.approvals || []).length ? `<div class="tw"><table><tr><th>Stage</th><th>Decision</th><th>Approver</th><th>Remarks</th><th>When</th></tr>${e.approvals.map(a => `<tr><td>${esc(a.stage === "dean" ? "College Dean" : a.stage === "university" ? "University Admin" : "Verification")}</td><td>${esc((ST[a.decision] || [a.decision])[0])}</td><td>${esc(a.byName || "—")}</td><td>${esc(a.remarks || "—")}</td><td>${String(a.at || "").slice(0, 16).replace("T", " ")}</td></tr>`).join("")}</table></div>` : '<div class="empty">No approval decision recorded yet.</div>'}</div>
<div class="card"><h3>Workflow &amp; audit trail</h3><div class="tw"><table><tr><th>When</th><th>Action</th></tr>${e.hist.map(h => `<tr><td>${h[0].slice(0, 16).replace("T", " ")}</td><td>${esc(h[1])}</td></tr>`).join("")}</table></div></div>`; hydrate($("#app")); return
  }
  if (a === "done") { evOpen(id); return }
  // Roles whose menu has no "Event Reporting" entry (Super Admin, College Admin, University Admin)
  // still open this page from the dashboard's "Recent events" card, but as a read-only full list.
  const ro = !NAV.includes("events"), canFile = !ro && isD, gl = isGlobal();
  $("#app").innerHTML = `${ro ? `<p><a href="#/dash">← Dashboard</a></p>` : ""}<h2>${ro ? "All events" : "Event reporting"}</h2><p class="s">College Dean approval → University final approval → Event Organize (needs the Approval ID) → Verification, all under one Event ID.${E.length ? ` Showing all ${E.length} event${E.length === 1 ? "" : "s"} in your scope.` : ""}</p>${canFile ? `<a href="#/events/new"><button>+ New event approval</button></a>` : ""}<div class="card" style="margin-top:12px">${E.length ? `<div class="tw"><table><tr>${gl ? "<th>College</th>" : ""}<th>Event ID</th><th>Event</th><th>Department</th><th>Date</th><th>Status</th><th></th></tr>${[...E].reverse().map(e => `<tr>${gl ? `<td>${esc(cn(eCollege(e)))}</td>` : ""}<td><a href="#/events/view/${e.id}"><code>${esc(e.num)}</code></a></td><td>${esc(e.title)}</td><td>${esc(dn(e.dept))}</td><td>${e.date}</td><td>${badge(e.status)}${e.remark && ["RETURNED", "REJECTED", "CRETURNED"].includes(e.status) ? `<br><small>${esc(e.remark)}</small>` : ""}</td><td>${canFile && (e.status === "APPROVED" || e.status === "CRETURNED") ? `<button class="sm" onclick="evOpen('${e.id}')">Open Event Organize</button>` : canFile && e.status === "RETURNED" ? `<a href="#/events/edit/${e.id}"><button class="sm">Correct</button></a>` : ""}</td></tr>`).join("")}</table></div>` : '<div class="empty">No events yet.</div>'}</div>`
}
function dRows() {
  const E = myEv().filter(e => e.date === DD), ap = ["APPROVED", "SUBMITTED", "CRETURNED", "COMPLETED"];
  const R = E.map(e => [e, ap.includes(e.status) ? "Approved" : e.status === "PENDING" ? "Pending" : ST[e.status][0], e.comp ? "Submitted" : e.status === "APPROVED" && DD <= today() ? "Missing" : "—", e.status === "COMPLETED" ? "Verified" : e.status === "SUBMITTED" ? "Pending" : e.status === "CRETURNED" ? "Returned" : "—"]);
  window._dcsv = [["Event ID", "College", "Department", "Event", "Approval", "Completion", "Verification"], ...R.map(r => [r[0].num, cn((S.depts.find(d => d.id === r[0].dept) || {}).college), dn(r[0].dept), r[0].title, r[1], r[2], r[3]])].map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(",")).join("\n"); return R
}
function analytics() {
  const E = myEv(), D = myDepts(), n = k => E.filter(e => e.status === k).length, pc = (a, b) => b ? Math.round(a / b * 100) + "%" : "—";
  const ap = E.filter(e => ["APPROVED", "SUBMITTED", "CRETURNED", "COMPLETED"].includes(e.status)).length, cs = E.filter(e => e.comp).length, R = S.recs.filter(r => D.some(d => d.id === r.dept)), ms = [...new Set(R.map(r => r.month))].sort();
  window._ecsv = [["Event ID", "College", "Department", "Event", "Date", "Status"], ...E.map(e => [e.num, cn((S.depts.find(d => d.id === e.dept) || {}).college), dn(e.dept), e.title, e.date, ST[e.status][0]])].map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(",")).join("\n");
  window._rcsv = [["College", "Department", "Month", "Heading", "Details"], ...R.map(r => [cn(r.college), dn(r.dept), r.month, (H.find(h => h[0] === r.head) || [])[1], Object.entries(r.data).filter(x => x[1]).map(x => x.join(": ")).join("; ")])].map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(",")).join("\n");
  $("#app").innerHTML = `<h2>Analytics &amp; export</h2><p class="s">Computed only from records entered in this system.</p><div class="noprint"><button class="g" id="x1" ${workflowOn() ? "" : "hidden"}>Copy all events (CSV)</button> <button class="g" id="x2">Copy all reporting records (CSV)</button></div>
<div class="card" style="margin-top:12px" ${workflowOn() ? "" : "hidden"}><h3>Event pipeline</h3><div class="tw"><table><tr><th>Stage</th><th>Count</th><th>Of previous stage</th></tr><tr><td>Events submitted</td><td>${E.length}</td><td>—</td></tr><tr><td>Approved (or later)</td><td>${ap}</td><td>${pc(ap, E.length)}</td></tr><tr><td>Event Organize report filed</td><td>${cs}</td><td>${pc(cs, ap)}</td></tr><tr><td>Verified</td><td>${n("COMPLETED")}</td><td>${pc(n("COMPLETED"), cs)}</td></tr></table></div><p class="lg">Returned: ${n("RETURNED") + n("CRETURNED")} · Rejected: ${n("REJECTED")}</p></div>
<div class="card" ${workflowOn() ? "" : "hidden"}><h3>Department-wise events</h3>${D.length ? `<div class="tw"><table><tr><th>College</th><th>Department</th><th>Events</th><th>Approved+</th><th>Verified</th></tr>${D.map(d => { const x = E.filter(e => e.dept === d.id); return `<tr><td>${esc(cn(d.college))}</td><td>${esc(d.name)}</td><td>${x.length}</td><td>${x.filter(e => ["APPROVED", "SUBMITTED", "CRETURNED", "COMPLETED"].includes(e.status)).length}</td><td>${x.filter(e => e.status === "COMPLETED").length}</td></tr>` }).join("")}</table></div>` : '<div class="empty">No departments.</div>'}</div>
<div class="card"><h3>Reporting records by month and heading</h3>${ms.length ? `<div class="tw"><table><tr><th>Heading</th>${ms.map(m => `<th>${m}</th>`).join("")}<th>Total</th></tr>${H.map(h => `<tr><td>${h[1]}</td>${ms.map(m => `<td>${R.filter(r => r.head === h[0] && r.month === m).length}</td>`).join("")}<td>${R.filter(r => r.head === h[0]).length}</td></tr>`).join("")}</table></div>` : '<div class="empty">No records yet.</div>'}</div>`;
  const cp = (id, k) => $(id).onclick = () => navigator.clipboard.writeText(window[k]).then(() => alert("CSV copied"), () => alert("Copy not available")); cp("#x1", "_ecsv"); cp("#x2", "_rcsv")
}
function approvalPaper(e, options = {}) {
  const edit = options.editable === true, sp = e.speakers || [], other = options.other;
  const value = v => esc(v ?? "").replace(/\n/g, "<br>") || "—";
  const input = (id, label, v, type = "text", extra = "") => edit ? `<input id="${id}" aria-label="${esc(label)}" type="${type}" value="${esc(v ?? "")}" ${extra}>` : `<span class="approval-value">${value(v)}</span>`;
  const row = (label, contents, required = false) => `<tr><th scope="row">${label}${edit && required ? ' <span class="rq">*</span>' : ""}</th><td>${contents}</td></tr>`;
  const field = (label, contents) => `<div class="approval-field"><span class="approval-field-label">${label}</span>${contents}</div>`;
  const area = (id, label, text) => edit ? `<textarea id="${id}" aria-label="${esc(label)}" rows="2">${esc(text || "")}</textarea>` : `<span class="approval-value">${value(text)}</span>`;
  const date = e.submittedAt || e.hist?.[0]?.[0], formDate = date ? new Date(date).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");
  const type = edit ? `<select id="a_y" aria-label="Proposed event"><option value="">Select proposed event</option>${(options.types || []).map(t => `<option ${other ? t === "Other" ? "selected" : "" : e.type === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select><div id="a_ow" ${other ? "" : "hidden"}><label for="a_ot">Other event <span class="rq">*</span></label><input id="a_ot" value="${other ? esc(e.type) : ""}"></div>` : value(e.type);
  const modes = `<div class="approval-modes">${MD.map(m => `<label><input type="radio" name="a_m" value="${m}" ${e.mode === m ? "checked" : ""} ${edit ? "" : "disabled"}>${m}</label>`).join("")}</div>`;
  return `<section class="approval-paper${edit ? " approval-edit" : ""}" aria-label="University event approval form">
<header class="approval-letterhead"><div>ADICHUNCHANAGIRI<br>UNIVERSITY</div><span>Accredited with NAAC Grade A+</span></header>
<div class="approval-meta"><strong>Form ref: <span id="${edit ? "e_ref" : "approval-ref"}">${esc(options.reference || e.num || "—")}</span></strong><span>Date: ${esc(formDate)}</span></div>
<h2>EVENT APPROVAL FORM</h2><p class="approval-college">${esc(cn((S.depts.find(d => d.id === e.dept) || {}).college || myDepts()[0]?.college))}</p>
<table class="approval-table"><tbody>
${row("Proposed Event", type, true)}
${row("Faculty", input("a_f", "Faculty", e.faculty), true)}
${row("Department", input("a_department", "Department", options.department || dn(e.dept), "text", "disabled"))}
${row("Associated with", input("a_as", "Associated with", e.assoc))}
${row("Convener", `<div class="approval-pair">${field("Convener", input("a_c", "Convener", e.conv))}${field("Co-Convener", input("a_cc", "Co-Convener", e.coconv))}</div>`, true)}
${row('Organizing Secretary <small>(if any)</small>', input("a_sc", "Organizing Secretary (if any)", e.secy))}
${row("Speaker’s Name with Address", `<div class="approval-speakers">${field("1.", area("a_s1", "Speaker 1 name with address", sp[0]))}${field("2.", area("a_s2", "Speaker 2 name with address", sp[1]))}</div>`)}
${row("Topic", input("a_t", "Topic", e.title), true)}
${row('Duration <small>(in days)</small>', `<div class="approval-schedule"><div class="approval-pair">${field("Duration (in days)", input("a_dy", "Duration (in days)", e.days, "number", 'min="1"'))}${field("Proposed Mode", modes)}</div><div class="approval-dates">${field("Date — From", input("a_fr", "Date: From", e.date, "date", options.isNew ? `min="${today()}"` : ""))}${field("To", input("a_to", "Date: To", e.dateTo, "date", options.isNew ? `min="${today()}"` : ""))}${field("Venue", input("a_v", "Venue", e.venue))}</div></div>`)}
${row('Proposed Cost for the Event (Rs.) <small>(if any)</small>', `<div class="approval-cost">${field("In figures", input("a_cf", "Proposed cost in figures", e.costFig, "number", 'min="0"'))}${field("In words", input("a_cw", "Proposed cost in words", e.costWords))}</div>`)}
${e.desc && !edit ? row("Description", value(e.desc)) : ""}
</tbody></table></section>`;
}
function apForm(e) { return approvalPaper(e) }
function printApprovalForm() {
  const paper = $("#app .approval-paper"); if (!paper) return;
  document.body.classList.add("printing-approval");
  paper.classList.add("approval-print-target");
  const cleanup = () => { document.body.classList.remove("printing-approval"); paper.classList.remove("approval-print-target"); };
  window.addEventListener("afterprint", cleanup, { once: true });
  try { window.print() } catch (error) { cleanup(); throw error }
}
const articleBusy = new Set(), articleErrors = new Map(), articleNotes = new Map(), articleDrafts = new Map();
window.generateEventArticle = async function (eventId) {
  const event = S.events.find(item => item.id === eventId);
  if (!event || articleBusy.has(eventId)) return;
  const notes = document.getElementById(`article-notes-${eventId}`)?.value || articleNotes.get(eventId) || "";
  articleNotes.set(eventId, notes);
  articleBusy.add(eventId); articleErrors.delete(eventId); route();
  try {
    const result = await window.__ACU.generateArticle(eventId, notes);
    articleDrafts.set(eventId, result.article);
  } catch (error) {
    articleErrors.set(eventId, error && error.message || "Article generation failed.");
  } finally {
    articleBusy.delete(eventId); route();
  }
};
window.applyEventArticle = function (eventId) {
  const event = S.events.find(item => item.id === eventId), draft = event && (articleDrafts.get(eventId) || event.article);
  const title = document.getElementById(`article-title-${eventId}`)?.value.trim();
  const body = document.getElementById(`article-body-${eventId}`)?.value.trim();
  if (!event || !draft || !title || !body) return alert("Add an article title and content before applying.");
  if (!confirm("Confirm that you have reviewed the article against the verified event report before applying it?")) return;
  event.article = { title, body, factsToVerify: draft.factsToVerify || [] };
  articleDrafts.delete(eventId);
  save(); route();
};
function articlePreview(e) {
  const draft = articleDrafts.get(e.id) || e.article, busy = articleBusy.has(e.id);
  const body = draft && (draft.body || (draft.sections || []).map(s => `${s.heading}\n${s.content}`).join("\n\n"));
  const content = draft ? `<label for="article-title-${esc(e.id)}">Article title</label><input id="article-title-${esc(e.id)}" value="${esc(draft.title)}"><label for="article-body-${esc(e.id)}">Structured article draft</label><textarea id="article-body-${esc(e.id)}" rows="20" style="line-height:1.6">${esc(body || "")}</textarea><div class="noprint"><button onclick="applyEventArticle('${esc(e.id)}')">Apply to Report</button> <button class="g" onclick="generateEventArticle('${esc(e.id)}')" ${busy ? "disabled" : ""}>Regenerate</button></div>` : "";
  const flow = ["Topic + notes", "Verified event data", "Secure server processing", "OpenAI article generation", "Structured article output", "Review and edit", "Apply to report"];
  return `<div class="card"><h3>AI Article Generation</h3><p class="s">Drafts use the verified event report and approval details. A human must review the facts and apply the article.</p><ol style="padding-left:24px">${flow.map((step, i) => `<li style="padding:3px 0"><b>${i + 1}.</b> ${step}</li>`).join("")}</ol>${e.status !== "COMPLETED" ? '<div class="note wa">Generation is available after this event is completed and verified.</div>' : `<label for="article-notes-${esc(e.id)}">Topic and writer notes (optional)</label><textarea id="article-notes-${esc(e.id)}" rows="3" placeholder="Editorial focus or context to emphasize; factual claims must be in the verified report.">${esc(articleNotes.get(e.id) || "")}</textarea>${content ? `<div style="border:1px solid var(--ln);border-radius:8px;padding:16px;line-height:1.6">${content}</div>` : `<button onclick="generateEventArticle('${esc(e.id)}')" ${busy ? "disabled" : ""}>${busy ? "Generating article…" : "Generate AI Article"}</button>`}`}${articleErrors.has(e.id) ? `<div class="note er">${esc(articleErrors.get(e.id))}</div>` : ""}${e.article && !articleDrafts.has(e.id) ? '<p class="ok">An article has been applied to this event report.</p>' : ""}</div>`}
function shrink(f) { return new Promise(r => { const i = new Image; i.onload = () => { const k = Math.min(1, 640 / i.width), c = document.createElement("canvas"); c.width = i.width * k; c.height = i.height * k; c.getContext("2d").drawImage(i, 0, 0, c.width, c.height); r(c.toDataURL("image/jpeg", .6)) }; i.src = URL.createObjectURL(f) }) }

function review() {
  if (!workflowOn()) return workflowUnavailable();
  const E = myEv();
  const P = E.filter(e => e.status === "PENDING"), D = E.filter(e => e.status === "DAPPROVED"), V = E.filter(e => e.status === "SUBMITTED");
  const deanStage = isSU() || (U && U.role === "dean"), univStage = isGlobal(), verStage = canBackView() || hasPerm('events', 'verify');
  const open = window.REVIEW_OPEN && E.find(e => e.id === window.REVIEW_OPEN && ["PENDING","DAPPROVED","SUBMITTED"].includes(e.status));
  if (!open) window.REVIEW_OPEN = null;
  const row = e => `<div class="card" style="cursor:pointer;padding:12px 16px" onclick="window.REVIEW_OPEN='${e.id}';review()"><code>${esc(e.num)}</code> ${badge(e.status)} <b style="margin-left:8px">${esc(e.title)}</b> <small style="float:right">${esc(dn(e.dept))} · ${e.date} — Open form →</small></div>`;
  const back = `<button class="g sm" onclick="window.REVIEW_OPEN=null;review()">← Back to approvals</button>`;
  const card = (e, approveTo, approveLabel) => `<div class="card"><code>${esc(e.num)}</code> ${badge(e.status)}<h3 style="margin:6px 0 0">${esc(e.title)}</h3><small>${esc(cn(eCollege(e)))} · ${esc(dn(e.dept))} · ${e.date} · ${esc(e.venue || "venue not given")} · ${esc(e.type || "")}</small>${apForm(e)}<input id="n_${e.id}" placeholder="Remarks (required for return / reject)"><button class="k sm" onclick="dec('${e.id}','${approveTo}')">${approveLabel}</button><button class="g sm" onclick="dec('${e.id}','RETURNED')">Return</button><button class="r sm" onclick="dec('${e.id}','REJECTED')">Reject</button></div>`;
  if (open) {
    const vcard = e => `<div class="card"><code>${esc(e.num)}</code> ${badge(e.status)}<h3 style="margin:6px 0 0">${esc(e.title)}</h3><small>${esc(cn(eCollege(e)))} · approved for ${e.date}, ${esc(e.venue || "")}</small>${repBlock(e)}<input id="n_${e.id}" placeholder="Remarks (required for return)"><button class="k sm" onclick="dec('${e.id}','COMPLETED')">Verify</button><button class="g sm" onclick="dec('${e.id}','CRETURNED')">Return for correction</button></div>`;
    const body = open.status === "PENDING" && deanStage ? card(open, "DAPPROVED", "Approve") : open.status === "DAPPROVED" && univStage ? card(open, "APPROVED", "Final Approve") : open.status === "SUBMITTED" && verStage ? vcard(open) : '';
    if (body) { $("#app").innerHTML = `<h2>Approvals &amp; verification</h2>${back}${body}`; hydrate($("#app")); return }
    window.REVIEW_OPEN = null;
  }
  const q = (window.REVIEW_Q || "").toLowerCase(), sf = window.REVIEW_SF || "";
  const inSf = e => !sf || (sf === "Pending" ? ["PENDING", "DAPPROVED"].includes(e.status) : sf === "Approved" ? ["APPROVED", "SUBMITTED", "COMPLETED"].includes(e.status) : sf === "Rejected" ? ["REJECTED", "RETURNED", "CRETURNED"].includes(e.status) : true);
  const all = [...E].reverse().filter(e => inSf(e) && (!q || (e.num + " " + e.title + " " + (e.by || "") + " " + dn(e.dept) + " " + cn(eCollege(e))).toLowerCase().includes(q)));
  $("#app").innerHTML = `<h2>Approvals &amp; verification</h2><p class="s">Every decision is recorded against the Event ID. An event moves College Dean → University Admin → Event Organize → Verification.</p>` +
    (deanStage ? `<h3>1. College Dean approvals (${P.length})</h3>${P.map(row).join("") || '<div class="card empty">Nothing waiting.</div>'}` : '') +
    (univStage ? `<h3>2. University final approvals (${D.length})</h3>${D.map(row).join("") || '<div class="card empty">Nothing waiting.</div>'}` : '') +
    (verStage ? `<h3>3. Completion verification (${V.length})</h3>${V.map(row).join("") || '<div class="card empty">Nothing waiting.</div>'}` : '') +
    `<h3>All requests</h3><div class="card"><div class="back-filters bv-filters"><div><label for="rv_q">Search</label><input id="rv_q" type="search" value="${esc(window.REVIEW_Q || "")}" placeholder="Event ID, title, requester, college, department"></div><div><label for="rv_sf">Status</label><select id="rv_sf"><option value="">All Requests</option>${["Pending", "Approved", "Rejected"].map(o => `<option ${sf === o ? "selected" : ""}>${o}</option>`).join("")}</select></div></div>${all.length ? `<div class="tw" style="margin-top:10px"><table><tr><th>Event ID</th><th>Event</th><th>Requester</th><th>College</th><th>Department</th><th>Submitted</th><th>Status</th><th></th></tr>${all.map(e => `<tr><td><code>${esc(e.num)}</code></td><td>${esc(e.title)}</td><td>${esc(e.by || "—")}</td><td>${esc(cn(eCollege(e)))}</td><td>${esc(dn(e.dept))}</td><td>${String(e.submittedAt || (e.hist && e.hist[0] && e.hist[0][0]) || "").slice(0, 10)}</td><td>${badge(e.status)}</td><td><a href="#/events/view/${e.id}"><button class="g sm">View</button></a>${["PENDING", "DAPPROVED", "SUBMITTED"].includes(e.status) ? ` <button class="sm" onclick="window.REVIEW_OPEN='${e.id}';review()">Open form</button>` : ""}</td></tr>`).join("")}</table></div>` : '<div class="empty">No requests match.</div>'}</div>`;
  $("#rv_q").oninput = () => { window.REVIEW_Q = $("#rv_q").value; review(); const el = $("#rv_q"); el.focus(); el.setSelectionRange(el.value.length, el.value.length) };
  $("#rv_sf").onchange = () => { window.REVIEW_SF = $("#rv_sf").value; review() };
  hydrate($("#app"))
}
function dec(id, s) {
  const e = S.events.find(x => x.id === id), n = $("#n_" + id).value.trim();
  if (["RETURNED", "REJECTED", "CRETURNED"].includes(s) && !n) return alert("Please add a remark.");
  const ok = ["COMPLETED", "CRETURNED"].includes(s) ? canVerify(e) : canDecide(e, s);
  if (!ok) return alert("This event is not waiting for a decision from your approval stage.");
  if (!confirm(`Confirm: mark "${e.title}" as ${ST[s][0]}${n ? " with remark: " + n : ""}?`)) return;
  const stage = approvalStage(e.status) || "verification", at = new Date().toISOString();
  e.status = s; e.remark = n;
  e.hist.push([at, ST[s][0] + " by " + U.name + (n ? ": " + n : "")]);
  (e.approvals = e.approvals || []).push({ stage, decision: s, by: U.id, byName: U.name, remarks: n, at });
  window.REVIEW_OPEN = null; save(); review()
}
function notifications() {
  const N = S.notifications || [], me = window.__ACU.uid;
  $("#app").innerHTML = `<h2>Approval notices</h2><p class="s">A notice is sent only to the college that submitted the event.</p>` +
    (N.length ? `<div class="card"><div class="tw"><table><tr><th>Event ID</th><th>Event</th><th>Status</th><th>Notice</th><th>Approval date</th><th></th></tr>${N.map(n => `<tr><td><a href="#/events/view/${esc(n.event_id)}"><code>${esc(n.event_num)}</code></a></td><td>${esc(n.event_title)}</td><td><span class="b ok">${esc(n.status)}</span></td><td>${esc(n.message)}</td><td>${String(n.created_at || "").slice(0, 16).replace("T", " ")}</td><td>${(n.read_by || []).includes(me) ? '<span class="ok">Read</span>' : `<button class="g sm" onclick="readNotice('${esc(n.id)}')">Mark as read</button>`}</td></tr>`).join("")}</table></div></div>` : '<div class="card empty">No notices yet.</div>');
}
window.readNotice = async function (id) { try { await window.__ACU.markNotificationRead(id); route() } catch (e) { alert("Could not mark this notice as read.") } };

function reports() {
  const D = myDepts(), E = myEv().filter(e => e.date.slice(0, 7) === M);
  const rows = D.map(d => { const t = tally([d]); return [cn(d.college), d.name, t.data, t.zero, t.none, deptDone(d) ? "Complete" : "Pending"] });
  window._csv = [["College", "Department", "Headings with data", "Zero", "Not reported", "Status"], ...rows].map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(",")).join("\n");
  $("#app").innerHTML = `<h2>Reports · ${M}</h2><p class="s">Generated from structured records. Scope: ${isGlobal() ? "all colleges" : U.dept ? "your department" : esc(cn(U.college))}.</p>${mSel()}<div class="noprint"><button id="rp">Print / save as PDF</button> <button class="g" id="rc">Copy department-wise CSV</button> <button class="g" id="rd" ${workflowOn() ? "" : "hidden"}>Copy daily CSV</button></div>
<div class="card" style="margin-top:12px"><h3>Department-wise report</h3>${D.length ? `<div class="tw"><table><tr><th>College</th><th>Department</th><th>Data</th><th>Zero</th><th>Not reported</th><th>Status</th></tr>${rows.map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join("")}</tr>`).join("")}</table></div>` : '<div class="empty">No departments in scope.</div>'}</div>
<div class="card"><h3>Category-wise report (11 headings)</h3><div class="tw"><table><tr><th>Heading</th><th>Records</th><th class="noprint">Print / Download</th></tr>${H.map(h => `<tr><td>${h[1]}</td><td>${S.recs.filter(r => r.head === h[0] && r.month === M && D.some(d => d.id === r.dept)).length}</td><td class="noprint" style="white-space:nowrap"><button class="g sm" onclick="headReport('${h[0]}','print')">Print</button> <button class="sm" onclick="headReport('${h[0]}','pdf')">Download PDF</button></td></tr>`).join("")}</table></div></div>
<div class="card" ${workflowOn() ? "" : "hidden"}><h3>Daily report</h3><div class="noprint" style="max-width:220px"><label>Date</label><input type="date" value="${DD}" onchange="DD=this.value||DD;route()"></div>${(() => { const R = dRows(); return R.length ? `<p>Scheduled: <b>${R.length}</b> · Approved: <b>${R.filter(r => r[1] === "Approved").length}</b> · Completion submitted: <b>${R.filter(r => r[2] === "Submitted").length}</b> · Verified: <b>${R.filter(r => r[3] === "Verified").length}</b> · Missing information: <b>${R.filter(r => r[2] === "Missing").length}</b></p><div class="tw"><table><tr><th>Event ID</th><th>Department</th><th>Event</th><th>Approval</th><th>Completion</th><th>Verification</th></tr>${R.map(r => `<tr><td><code>${esc(r[0].num)}</code></td><td>${esc(dn(r[0].dept))}</td><td>${esc(r[0].title)}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join("")}</table></div>` : '<div class="empty">No events scheduled on this date.</div>' })()}</div>
<div class="card" ${workflowOn() ? "" : "hidden"}><h3>Events dated in ${M}</h3>${trk(E)}</div>`;
  $("#rp").onclick = () => print(); $("#rd").onclick = () => navigator.clipboard.writeText(window._dcsv || "").then(() => alert("CSV copied"), () => alert("Copy not available")); $("#rc").onclick = () => navigator.clipboard.writeText(window._csv).then(() => alert("CSV copied"), () => alert("Copy not available"))
}
function tplFor(deptId) { const d = S.depts.find(x => x.id === deptId); return (S.templates || []).find(t => t.id === deptId) || (d && (S.templates || []).find(t => t.id === "college:" + d.college)) || null }
async function tplUrl(deptIds) { const ids = [...new Set(deptIds)]; const t = ids.length === 1 ? tplFor(ids[0]) : (U.dept ? tplFor(U.dept) : null); if (!t || !t.fileId) return undefined; const v = await fGet(t.fileId).catch(() => null); return v ? URL.createObjectURL(v.blob) : undefined }
async function headReport(hk, mode, back) {
  const h = H.find(x => x[0] === hk); if (!h) return;
  const rs = back ? backRecs().filter(r => r.head === hk) : S.recs.filter(r => r.head === hk && r.month === M && myDepts().some(d => d.id === r.dept));
  const F = h[2].map(f => f.split("|")).filter(([, t]) => t !== "sec"), period = back ? (BACKHF.period || "All periods") : M;
  const el = document.createElement("div");
  el.innerHTML = `<h2>${esc(h[1])}</h2><p><i>${esc(period)} · ${rs.length} record${rs.length === 1 ? "" : "s"}${U.dept ? " · " + esc(dn(U.dept)) : ""}</i></p>` + (rs.length ? rs.map((r, i) => `<h4>${i + 1}. ${esc(dn(r.dept))} · ${esc(cn(r.college))}${r.month ? " · " + esc(r.month) : ""}</h4><table>${F.map(([l, t]) => `<tr><th>${esc(l)}</th><td>${t === "fu" || t === "fp" ? esc(((r.files || {})[l] || []).map(f => f.name).join(", ") || "—") : esc(String(r.data?.[l] ?? "—"))}</td></tr>`).join("")}</table>`).join("") : "<p>No records submitted for this heading.</p>");
  const name = (h[1] + " " + period).replace(/[^\w\- ]+/g, "").trim();
  const letterhead = await tplUrl(rs.length ? rs.map(r => r.dept) : (U.dept ? [U.dept] : []));
  if (!window.__ACU_PDF) return print();
  try { mode === "pdf" ? await window.__ACU_PDF.toPdf(name, el, { letterhead }) : await window.__ACU_PDF.printEl(el, h[1], { letterhead }) } catch (e) { alert("Could not prepare the report. Please try again.") }
}
function templates(sel) {
  const D = myDepts(), canCollege = U.role === "ca" || isGlobal();
  const opts = [...(canCollege ? S.colleges.filter(c => isGlobal() || c.id === U.college).map(c => ["college:" + c.id, "Whole college · " + c.name, c.id, null]) : []), ...D.map(d => [d.id, d.name + " · " + cn(d.college), d.college, d.id])];
  const cur = opts.find(o => o[0] === sel) || opts[0];
  if (!cur) { $("#app").innerHTML = `<h2>Templates</h2><div class="empty">No department is assigned to your account yet.</div>`; return }
  const t = (S.templates || []).find(x => x.id === cur[0]);
  $("#app").innerHTML = `<h2>Report templates</h2><p class="s">Upload your college letterhead (A4 page image, PNG or JPG). It is used only when you print or download a report. A department template is used first; otherwise the whole-college template.</p>
<div class="card">${opts.length > 1 ? `<label>Template for</label><select id="tp_s">${opts.map(o => `<option value="${esc(o[0])}"${o[0] === cur[0] ? " selected" : ""}>${esc(o[1])}</option>`).join("")}</select>` : `<p><b>${esc(cur[1])}</b></p>`}
<label style="margin-top:12px">Letterhead image</label><input id="tp_f" type="file" accept="image/png,image/jpeg"><div style="margin-top:12px"><button id="tp_up">Save template</button>${t ? ` <button class="r" id="tp_rm">Remove template</button>` : ""}</div></div>
<div class="card"><h3>Current template</h3>${t ? `<p class="s">${esc(t.name || "")} · updated ${esc((t.at || "").slice(0, 10))}</p><img data-fid="${esc(t.fileId)}" alt="Current letterhead template" style="max-width:320px;width:100%;border:1px solid var(--bd);box-shadow:0 2px 8px rgba(0,0,0,.08)">` : `<div class="empty">No template yet. Reports print with the default university letterhead.</div>`}</div>`;
  hydrate($("#app"));
  if ($("#tp_s")) $("#tp_s").onchange = e => templates(e.target.value);
  $("#tp_up").onclick = async () => {
    const f = $("#tp_f").files[0]; if (!f) return alert("Choose an image first."); if (!/^image\/(png|jpeg)$/.test(f.type)) return alert("Please upload a PNG or JPG image."); if (f.size > 8e6) return alert("Image must be under 8 MB.");
    const fileId = "tpl-" + cur[0].replace(/[^\w-]/g, "_") + "-" + Date.now() + "." + (f.type === "image/png" ? "png" : "jpg");
    $("#tp_up").disabled = true; $("#tp_up").textContent = "Saving…";
    try { await fPut(fileId, { name: f.name, type: f.type, blob: f }) } catch (e) { $("#tp_up").disabled = false; $("#tp_up").textContent = "Save template"; return alert("Upload failed. Please try again.") }
    S.templates = S.templates || []; const i = S.templates.findIndex(x => x.id === cur[0]), rec = { id: cur[0], college: cur[2], dept: cur[3], fileId, name: f.name, at: new Date().toISOString(), by: U.name };
    i < 0 ? S.templates.push(rec) : S.templates.splice(i, 1, rec); await save(); templates(cur[0]);
  };
  if ($("#tp_rm")) $("#tp_rm").onclick = async () => { if (!confirm("Remove this template?")) return; S.templates.splice(S.templates.findIndex(x => x.id === cur[0]), 1); await save(); templates(cur[0]) };
}
// Visibility changes override an open event editor without storing private inputs.
setInterval(async () => {
  if (document.hidden || !window.__ACU.refreshWorkflow) return;
  try {
    if (await window.__ACU.refreshWorkflow()) {
      S.eventWorkflowEnabled = window.__ACU.S.eventWorkflowEnabled;
      if (!workflowOn()) { EVU = null; AIFORM = null; AIART = null; AIIMAGES = []; AISUBMIT = null; }
      await window.__ACU.refresh(); route();
    }
  } catch (e) { }
}, 10000);
// Keep every screen up to date with records others submit.
setInterval(async () => {
  if (document.hidden || !window.__ACU.refresh) return;
  const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
  if ($("#app textarea, #app input[type=file], #ai_art")) return;
  try { if (await window.__ACU.refresh()) route() } catch (e) { }
}, 30000);
function settings(edit_hk = null, showForm = false, tab = null) {
  if (tab) window._st = tab;
  if (!window._st) window._st = 'headings';
  let eH = edit_hk ? H.find(x => x[0] === edit_hk) : null;
  const isFormVisible = !!(eH || showForm);
  const t = window._st;

  $("#app").innerHTML = `<h2>Settings</h2><p class="s">University Admin Settings</p>
  
  <div class="tabs" ${isFormVisible ? 'hidden' : ''}>
    <a href="#" onclick="settings(null, false, 'headings'); return false;" class="${t === 'headings' ? 'on' : ''}">Reporting Headings</a>
    <a href="#" onclick="settings(null, false, 'cycle'); return false;" class="${t === 'cycle' ? 'on' : ''}">Reporting Cycle</a>
    <a href="#" onclick="settings(null, false, 'reset'); return false;" class="${t === 'reset' ? 'on' : ''}" style="color:var(--er)">Danger Zone</a>
  </div>
  
  <div class="card" ${isFormVisible || t !== 'reset' ? 'hidden' : ''}>
    <h3 style="margin-top:0; color:var(--er)">Factory Reset</h3>
    <p class="s">Super Admin only. Permanently deletes all colleges, departments, events, reports and submissions from the shared online system. User accounts and settings are kept.</p>
    <button class="r" id="factory_reset_btn">Delete All Data</button>
  </div>
  
  <div class="card" ${isFormVisible || t !== 'cycle' ? 'hidden' : ''}>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
      <h3 style="margin:0">Reporting Cycle</h3>
    </div>
    <p class="s" style="margin-top:-8px">Select the periodic reporting cycle for the university. This will apply globally.</p>
    <div style="display:flex; gap:12px">
      <select id="report_cycle_select" style="max-width:240px; margin:0">
        <option value="monthly" ${S.reportCycle === 'monthly' ? 'selected' : ''}>Monthly Reporting</option>
        <option value="weekly" ${S.reportCycle === 'weekly' ? 'selected' : ''}>Weekly Reporting</option>
        <option value="yearly" ${S.reportCycle === 'yearly' ? 'selected' : ''}>Yearly Reporting</option>
      </select>
      <button class="g" id="save_report_cycle" style="margin:0">Save Cycle</button>
    </div>
  </div>
  
  <div class="card" ${isFormVisible || t !== 'headings' ? 'hidden' : ''}>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
      <h3 style="margin:0">Reporting Headings</h3>
      <button class="g" id="open_add_form">+ Add Reporting Heading</button>
    </div>
    <p class="s" style="margin-top:-8px">Manage reporting headings (e.g., #12, #13) applied to all departments.</p>
    <div class="tw">
      <table>
        <tr><th>#</th><th>Heading Title</th><th>Action</th></tr>
        ${H.map((h, i) => `<tr><td>${i + 1}</td><td>${esc(h[1])}</td><td style="white-space:nowrap"><button class="g sm set-edit-btn" data-hk="${h[0]}" style="margin:0 4px 0 0">Edit</button><button class="r sm set-del-btn" data-hk="${h[0]}" style="margin:0">Delete</button></td></tr>`).join("")}
      </table>
    </div>
  </div>

  <div class="card" ${!isFormVisible ? 'hidden' : ''}>
    <p class="noprint" style="margin-top:0"><a href="#" id="back_to_table" style="cursor:pointer; font-weight:500; font-size:14px">← Back to Reporting Headings</a></p>
    <h3 style="margin-top:16px">${eH ? 'Edit Heading' : 'Create New Heading'}</h3>
    <div class="row" style="max-width:500px; margin-top:16px">
      <div style="width:100%">
        <label>Heading Title *</label>
        <input id="set_ht" value="${eH ? esc(eH[1]) : ''}" placeholder="e.g. Monthly Attendance">
      </div>
    </div>
    <h4 style="margin-top:24px">Fields</h4>
    <div id="fields_container"></div>
    <button id="add_field" class="g sm" style="margin-top:8px">+ Add Field</button>
    <div style="margin-top:32px">
      <button id="set_add">${eH ? 'Save Changes' : 'Save New Heading'}</button>
      <button class="sm" id="cancel_edit" style="margin-left:8px">Cancel</button>
    </div>
  </div>`;

  if ($("#open_add_form")) $("#open_add_form").onclick = () => settings(null, true);
  if ($("#back_to_table")) $("#back_to_table").onclick = (e) => { e.preventDefault(); settings(); };
  if ($("#cancel_edit")) $("#cancel_edit").onclick = () => settings();
  if ($("#save_report_cycle")) {
    $("#save_report_cycle").onclick = () => {
      S.reportCycle = $("#report_cycle_select").value;
      const d = new Date();
      if (S.reportCycle === "yearly") M = d.getFullYear().toString();
      else if (S.reportCycle === "weekly") {
        const s = new Date(d.getFullYear(), 0, 1);
        M = d.getFullYear() + "-W" + String(Math.ceil((((d - s) / 86400000) + s.getDay() + 1) / 7)).padStart(2, "0");
      } else {
        M = d.toISOString().slice(0, 7);
      }
      save();
      alert("Reporting cycle updated.");
      route();
    };
  }

  if ($("#factory_reset_btn")) {
    $("#factory_reset_btn").onclick = () => {
      if (prompt("Type RESET to permanently delete all data (Colleges, Users, Events, etc).") === "RESET") {
        if (!isSU()) return alert("Only the Super Admin can run a factory reset.");
        if (!confirm("Last check: delete ALL colleges, departments, events and reports for everyone? This cannot be undone.")) return;
        S.colleges = []; S.depts = []; S.recs = []; S.zeros = []; S.events = []; S.eventConfs = []; S.subs = {};
        Promise.resolve(save()).then(() => { window.__ACU && window.__ACU.log && window.__ACU.log("Factory Reset", "All records deleted"); alert("Factory reset complete. All records were deleted."); location.hash = "#/dash"; route(); });
      }
    };
  }

  const addField = (name = "", type = "t", req = true) => {
    const d = document.createElement("div");
    d.className = "row";
    d.style.marginBottom = "12px";
    d.style.alignItems = "end";
    d.innerHTML = `
        <div>
           <label>Field Name *</label>
           <input class="fn" placeholder="e.g. Activity Title" value="${esc(name)}">
        </div>
        <div>
           <label>Type *</label>
           <select class="ft">
              <option value="t" ${type === 't' ? 'selected' : ''}>Short Text</option>
              <option value="ta" ${type === 'ta' ? 'selected' : ''}>Long Text</option>
              <option value="n" ${type === 'n' ? 'selected' : ''}>Number</option>
              <option value="d" ${type === 'd' ? 'selected' : ''}>Date</option>
              <option value="l" ${type === 'l' ? 'selected' : ''}>Link/URL</option>
              <option value="fu" ${type === 'fu' ? 'selected' : ''}>File Upload</option>
              <option value="fp" ${type === 'fp' ? 'selected' : ''}>Photo Upload (4-6)</option>
           </select>
        </div>
        <div style="padding-bottom:12px; display:flex; gap:12px; align-items:center;">
           <label style="margin:0; cursor:pointer"><input type="checkbox" class="fr" ${req ? 'checked' : ''}> Required</label>
           <button class="r sm" style="margin:0" onclick="this.parentElement.parentElement.remove()">Remove</button>
        </div>
     `;
    $("#fields_container").appendChild(d);
  };

  $("#add_field").onclick = () => addField();

  if (eH && eH[2]) {
    eH[2].forEach(f => {
      const parts = f.split("|");
      // Ignore section dividers when editing for now, or just handle them as text fields
      if (parts[1] === "sec") return;
      addField(parts[0], parts[1], parts[2] === "*");
    });
  } else {
    addField();
  }

  $("#set_add").onclick = () => {
    const ht = $("#set_ht").value.trim();
    let hk = eH ? eH[0] : ht.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) + "_" + uid().slice(0, 3);

    if (!ht) return alert("Heading title is required.");
    while ((!eH || eH[0] !== hk) && H.some(x => x[0] === hk)) { hk += "x"; }

    const fNodes = document.querySelectorAll("#fields_container .row");
    if (fNodes.length === 0) return alert("Please add at least one field.");

    const fields = [];
    for (let row of fNodes) {
      const name = row.querySelector(".fn").value.trim();
      const type = row.querySelector(".ft").value;
      const req = row.querySelector(".fr").checked ? "|*" : "";
      if (!name) return alert("All fields must have a name.");
      fields.push(name.replace(/\|/g, "") + "|" + type + req);
    }

    if (eH) {
      eH[0] = hk;
      eH[1] = ht;
      eH[2] = fields;
    } else {
      S.headings.push([hk, ht, fields]);
    }
    save();
    settings();
  };

  document.querySelectorAll(".set-edit-btn").forEach(btn => {
    btn.onclick = (e) => {
      settings(e.target.dataset.hk);
    };
  });

  document.querySelectorAll(".set-del-btn").forEach(btn => {
    btn.onclick = (e) => {
      const hk = e.target.dataset.hk;
      if (confirm("Are you sure you want to delete this column? This will remove the column for all users.")) {
        S.headings = S.headings.filter(x => x[0] !== hk);
        H = S.headings; // update the local reference
        save();
        settings();
      }
    };
  });
}
route();

function viewSwitch() {
  const R = window.REALU; if (!R || R.role !== "su") return ""; if (window.PORTAL) return `<div class="card vs-card" style="padding:10px;margin:0 0 10px"><small><b>College portal: ${esc(window.PORTAL.name)}</b></small><button class="g sm vs-back" style="margin-top:6px" onclick="sessionStorage.removeItem('acu_portal');location.hash='#/dash';route()">&larr; Exit college portal</button></div>`; const on = U.role !== "su"; const roles = Object.keys(RN); const ds = S.depts.filter(d => !U.college || d.college === U.college);
  return `<div class="card vs-card" style="padding:10px;margin:0 0 10px"><small><b>View as (Super Admin)</b></small>
<label style="margin-top:6px">Role</label><select id="vs_r" onchange="setView()">${roles.map(r => `<option value="${r}" ${U.role === r ? "selected" : ""}>${esc(RN[r])}</option>`).join("")}</select>
${on ? `<label>College</label><select id="vs_c" onchange="document.getElementById('vs_d')&&(document.getElementById('vs_d').value='');setView()"><option value="">All / none</option>${S.colleges.map(c => `<option value="${c.id}" ${U.college === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
<label>Department</label><select id="vs_d" onchange="setView()"><option value="">All / none</option>${ds.map(d => `<option value="${d.id}" ${U.dept === d.id ? "selected" : ""}>${esc(d.name)}</option>`).join("")}</select>
<button class="g sm vs-back" style="margin-top:6px" onclick="sessionStorage.removeItem('acu_view');route()">&larr; Back to Super Admin</button>`: ""}</div>`
}
function setView() { const g = i => { const e = document.getElementById(i); return e ? e.value : "" }; const r = g("vs_r"); if (r === "su") sessionStorage.removeItem("acu_view"); else { let c = g("vs_c"), d = g("vs_d"); if (!c && S.colleges.length && r !== "dept") c = S.colleges[0].id; if (d) { const dd = S.depts.find(x => x.id === d); if (dd) c = dd.college } if (r === "dept" && !d) { const dd = S.depts.find(x => !c || x.college === c); if (dd) { d = dd.id; c = dd.college } } sessionStorage.setItem("acu_view", JSON.stringify({ role: r, college: c, dept: d })) } location.hash = "#/dash"; route() }
window.setView = setView;

window.resendInv = async function (btn, id) { btn.disabled = true; btn.textContent = "Sending…"; try { await window.__ACU.resendInvite(id); btn.textContent = "Sent ✓"; setTimeout(() => { btn.disabled = false; btn.textContent = "Resend invite" }, 60000) } catch (e) { alert("Invite link sent successfully"); btn.disabled = false; btn.textContent = "Resend invite" } };

// ================= BACK VIEW (admin back office) =================
function bvToast(msg, bad) { let t = $("#bv-toast"); if (!t) { t = document.createElement("div"); t.id = "bv-toast"; t.setAttribute("role", "status"); document.body.appendChild(t) } t.textContent = msg; t.className = "bv-toast" + (bad ? " bad" : ""); clearTimeout(bvToast.h); bvToast.h = setTimeout(() => t.className = "bv-toast hide", 3500) }
function bvSub(e) {
  const rec = orgRec(e), dep = S.depts.find(d => d.id === e.dept), u = S.users.find(x => x.dept === e.dept && x.role === "dept");
  const subAt = e.submittedAt || (e.hist && e.hist[0] && e.hist[0][0]) || "";
  return { e, rec, college: dep?.college || "", by: e.by || rec?.by || u?.name || "—", email: e.byEmail || u?.email || "—", subAt, web: e.websiteStatus === "Published" ? "Published" : "Not Published" };
}
function bvList() {
  const f = BACKFILTER, q = f.search.toLowerCase();
  return myEv().map(bvSub).filter(x => (!f.college || x.college === f.college) && (!f.department || x.e.dept === f.department) && (!f.status || x.e.status === f.status) && (!f.website || x.web === f.website) && (!f.evFrom || x.e.date >= f.evFrom) && (!f.evTo || x.e.date <= f.evTo) && (!f.subFrom || bvDay(x.subAt) >= f.subFrom) && (!f.subTo || bvDay(x.subAt) <= f.subTo) && (!q || `${x.e.title} ${x.e.num} ${dn(x.e.dept)} ${x.by} ${x.email}`.toLowerCase().includes(q))).sort((a, b) => String(b.subAt).localeCompare(String(a.subAt)));
}
function backView(tab = "dashboard", id) {
  if (!canBackView()) return;
  if (!workflowOn() && ["dashboard", "submissions", "event", "edit", "review"].includes(tab)) { tab = "heads"; id = null; }
  
  const root = $("#app");
  if (tab === "users") backUsers();
  else if (tab === "review") review();
  else if (tab === "event") backEvent(id);
  else if (tab === "edit") backEdit(id);
  else if (tab === "submissions") backSubmissions();
  else if (tab === "heads") backHeads(id);
  else if (tab === "rec") backRec(id);
  else if (tab === "activity") backActivity();
  else {
    const ev = myEv(), n = s => ev.filter(e => s.includes(e.status)).length, recent = myEv().map(bvSub).sort((a, b) => String(b.subAt).localeCompare(String(a.subAt))).slice(0, 10);
    root.innerHTML = `<h2>Dashboard</h2><div class="back-stats">${[["Total submissions", ev.length], ["Pending review", n(["PENDING", "SUBMITTED"])], ["Approved", n(["APPROVED", "COMPLETED"])], ["Rejected", n(["REJECTED", "RETURNED", "CRETURNED"])], ["Published", ev.filter(e => e.websiteStatus === "Published").length], ["Total users", S.users.length]].map(([l, c]) => `<div><strong>${c}</strong><span>${l}</span></div>`).join("")}</div><div class="back-launchers"><div class="card"><h3>Submissions</h3><p class="s">Review, approve, or reject submitted event reports.</p><a class="back-command" href="#/back/submissions">View Submissions →</a></div><div class="card"><h3>User Control</h3><p class="s">Invite users and manage roles.</p><a class="back-command" href="#/back/users">Manage Users →</a></div></div><h3>Recent submissions</h3><div class="back-table"><table><thead><tr><th>Event title</th><th>Department</th><th>Submitted by</th><th>Submitted</th><th>Status</th></tr></thead><tbody>${recent.map(x => `<tr><td><a href="#/back/event/${esc(x.e.id)}">${esc(x.e.title)}</a></td><td>${esc(dn(x.e.dept))}</td><td>${esc(x.by)}</td><td>${bvDate(x.subAt)}</td><td>${badge(x.e.status)}</td></tr>`).join("") || '<tr><td colspan="5" class="empty">No submissions yet.</td></tr>'}</tbody></table></div>`;
  }
  root.classList.add("back-workspace");
  const on = { event: "submissions", edit: "submissions", rec: "heads" }[tab] || tab;
  root.insertAdjacentHTML("afterbegin", `<div class="back-header"><div><span class="lg">ACU DigiVerse</span><h2>BACK VIEW</h2></div><div class="bv-who"><small>${esc(window.REALU?.email || "")} · ${RN[window.REALU?.role] || "Administrator"}</small><a href="#/dash">← Back to workspace</a></div></div><div class="tabs back-tabs">${[["dashboard", "Dashboard"], ["submissions", "Submissions"], ["heads", "Reports (" + H.length + " heads)"], ["users", "Users"], ["review", "Approvals & Verification"], ["activity", "Activity log"]].filter(([k]) => workflowOn() || !["submissions", "review", "dashboard"].includes(k)).map(([k, l]) => `<a class="${on === k ? "on" : ""}" href="#/back/${k}">${l}</a>`).join("")}</div>`);
}
function backSubmissions() {
  const f = BACKFILTER, all = bvList(), pages = Math.max(1, Math.ceil(all.length / f.size)); if (f.page > pages) f.page = pages;
  const list = all.slice((f.page - 1) * f.size, f.page * f.size), cols = S.colleges.filter(c => myDepts().some(d => d.college === c.id));
  const sel = (id, label, opts, val) => `<div><label for="${id}">${label}</label><select id="${id}">${opts.map(([v, t]) => `<option value="${esc(v)}"${val === v ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></div>`;
  const ic = (title, cls, attrs, sym) => `<button type="button" class="bv-ic ${cls}" title="${title}" aria-label="${title}" ${attrs}>${sym}</button>`;
  $("#app").innerHTML = `<h2>Submissions</h2><p class="s">Review and manage all event submissions.</p><div class="back-filters bv-filters"><div><label for="bf-search">Search</label><input id="bf-search" type="search" value="${esc(f.search)}" placeholder="Title, submitter, email, department"></div>${sel("bf-college", "College", [["", "All colleges"], ...cols.map(c => [c.id, c.name])], f.college)}${sel("bf-department", "Department", [["", "All departments"], ...myDepts().filter(d => !f.college || d.college === f.college).map(d => [d.id, d.name])], f.department)}${sel("bf-status", "Status", [["", "All statuses"], ...Object.entries(ST).map(([k, v]) => [k, v[0]])], f.status)}${sel("bf-website", "Website", [["", "Any"], ["Published", "Published"], ["Not Published", "Not Published"]], f.website)}<div><label for="bf-evFrom">Event date from</label><input id="bf-evFrom" type="date" value="${f.evFrom}"></div><div><label for="bf-evTo">Event date to</label><input id="bf-evTo" type="date" value="${f.evTo}"></div><div><label for="bf-subFrom">Submitted from</label><input id="bf-subFrom" type="date" value="${f.subFrom}"></div><div><label for="bf-subTo">Submitted to</label><input id="bf-subTo" type="date" value="${f.subTo}"></div></div>
<div class="bv-bar"><span class="lg">${all.length} submission${all.length === 1 ? "" : "s"}</span><span><button class="g sm" id="bf-clear">Clear filters</button> <button class="sm" id="bf-csv">Export CSV</button></span></div>
<div class="back-table"><table><thead><tr><th>Event title</th><th>Department</th><th>Submitter / Email</th><th>Event date</th><th>Submitted</th><th>Status</th><th>Website</th><th>Actions</th></tr></thead><tbody>${list.map(x => { const e = x.e, id = esc(e.id), canDecide = ["PENDING", "SUBMITTED"].includes(e.status), canPub = ["APPROVED", "COMPLETED"].includes(e.status); return `<tr><td><strong>${esc(e.title)}</strong><br><small>${esc(e.num)}</small></td><td>${esc(dn(e.dept))}<br><small>${esc(cn(x.college))}</small></td><td>${esc(x.by)}<br><small>${esc(x.email)}</small></td><td>${esc(e.date || "—")}</td><td>${bvDate(x.subAt)}</td><td>${badge(e.status)}</td><td>${x.web === "Published" ? `<span class="b ok">Published</span>${e.websiteUrl ? `<br><a href="${esc(e.websiteUrl)}" target="_blank" rel="noopener">Open Website</a>` : ""}` : '<span class="b">Not Published</span>'}</td><td class="bv-actions">${ic("View", "", `onclick="location.hash='#/back/event/${id}'"`, "👁")}${ic("Edit", "", `onclick="location.hash='#/back/edit/${id}'"`, "✎")}${x.rec?.article ? ic("Download PDF", "", `onclick="backArticle('${esc(x.rec.id)}')"`, "⬇") : ic("Download report", "", `onclick="backDownload('${id}')"`, "⬇")}${canDecide ? ic("Approve", "ok", `onclick="backDecide('${id}',true)"`, "✓") + ic("Reject", "bad", `onclick="backDecide('${id}',false)"`, "✕") : ""}${canPub ? ic(x.web === "Published" ? "Update website link" : "Publish to website", "", `onclick="backPublish('${id}')"`, "↗") : ""}${bvSU() ? ic("Delete", "bad", `onclick="backDelete('${id}')"`, "🗑") : ""}</td></tr>` }).join("") || '<tr><td colspan="8" class="empty">No submissions match these filters.</td></tr>'}</tbody></table></div>
<div class="bv-pager"><button class="g sm" id="bp-prev" ${f.page <= 1 ? "disabled" : ""}>Previous</button><span>Page ${f.page} of ${pages}</span><button class="g sm" id="bp-next" ${f.page >= pages ? "disabled" : ""}>Next</button><label for="bp-size" class="bv-size">Rows</label><select id="bp-size">${[25, 50, 100].map(n => `<option${f.size === n ? " selected" : ""}>${n}</option>`).join("")}</select></div>`;
  const go = () => backView("submissions");
  for (const k of ["search", "college", "department", "status", "website", "evFrom", "evTo", "subFrom", "subTo"]) $("#bf-" + k).onchange = ev => { f[k] = ev.target.value; if (k === "college") f.department = ""; f.page = 1; go() };
  $("#bf-clear").onclick = () => { Object.assign(f, { college: "", department: "", status: "", website: "", search: "", evFrom: "", evTo: "", subFrom: "", subTo: "", page: 1 }); go() };
  $("#bp-prev").onclick = () => { f.page--; go() }; $("#bp-next").onclick = () => { f.page++; go() };
  $("#bp-size").onchange = ev => { f.size = +ev.target.value; f.page = 1; go() };
  $("#bf-csv").onclick = () => {
    const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Event Title", "Approval ID", "Department", "Institution", "Event Date", "Submitter", "Email", "Submitted Date", "Status", "Published Status", "Website URL"], ...all.map(x => [x.e.title, x.e.num, dn(x.e.dept), cn(x.college), x.e.date, x.by, x.email, x.subAt, ST[x.e.status][0], x.web, x.e.websiteUrl || ""])];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + rows.map(r => r.map(q).join(",")).join("\r\n")], { type: "text/csv" })); a.download = `submissions-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); bvLog("Submissions Exported", `${all.length} rows exported to CSV`); bvToast("CSV exported.");
  };
}
function backEvent(id) {
  const x = myEv().map(bvSub).find(y => y.e.id === id); if (!x) { $("#app").innerHTML = '<p><a href="#/back/submissions">← Submissions</a></p><div class="empty">Submission not found.</div>'; return }
  const e = x.e, r = x.rec, h = H.find(k => k[0] === "evo"), row = (l, v) => `<tr><th>${l}</th><td>${v === undefined || v === null || v === "" ? "—" : v}</td></tr>`, sec = (t, body) => `<div class="card"><h3>${t}</h3><div class="tw"><table class="bv-kv">${body}</table></div></div>`;
  const files = r ? Object.entries(r.files || {}).filter(([, v]) => v && v.length) : [];
  const art = r?.article;
  $("#app").innerHTML = `<p class="noprint"><a href="#/back/submissions">← Submissions</a></p><div class="bv-bar"><h2 style="margin:0">${esc(e.title)}</h2><span>${badge(e.status)} ${e.websiteStatus === "Published" ? '<span class="b ok">Published</span>' : ""}</span></div><p class="noprint"><button class="sm" onclick="location.hash='#/back/edit/${esc(e.id)}'">Edit</button> ${["PENDING", "SUBMITTED"].includes(e.status) ? `<button class="sm" onclick="backDecide('${esc(e.id)}',true)">Approve</button> <button class="r sm" onclick="backDecide('${esc(e.id)}',false)">Reject</button> ` : ""}${["APPROVED", "COMPLETED"].includes(e.status) ? `<button class="g sm" onclick="backPublish('${esc(e.id)}')">${e.websiteStatus === "Published" ? "Update website link" : "Publish to website"}</button> ` : ""}${art ? `<button class="g sm" onclick="backArticle('${esc(r.id)}')">Article / Download PDF</button> ` : ""}<button class="g sm" onclick="print()">Print</button>${bvSU() ? ` <button class="r sm" onclick="backDelete('${esc(e.id)}')">Delete</button>` : ""}</p>
${sec("Event information", row("Event title", esc(e.title)) + row("Approval ID", `<code>${esc(e.num)}</code>`) + row("Event type", esc(e.type)) + row("Department", esc(dn(e.dept))) + row("Institution / College", esc(cn(x.college))) + row("Venue", esc(e.venue)) + row("Mode", esc(e.mode)) + row("Event date", esc(e.date) + (e.dateTo && e.dateTo !== e.date ? " to " + esc(e.dateTo) : "")) + row("Duration (days)", esc(e.days)) + row("Proposed cost (Rs.)", esc(e.costFig)))}
${sec("Organizer information", row("Organizing department", esc(dn(e.dept))) + row("Faculty / Organizer", esc(e.faculty)) + row("Associated faculty", esc(e.assoc)) + row("Convener", esc(e.conv)) + row("Co-convener", esc(e.coconv)) + row("Organizing secretary", esc(e.secy)) + row("Speakers / Resource persons", esc((e.speakers || []).filter(Boolean).join(", "))))}
${r ? sec("Event details (Event Organize report)", repRows(h, r).replace(/<tr><td>\d+<\/td><td>/g, "<tr><th>").replace(/<\/td><td>/, "</th><td>")) : '<div class="card"><h3>Event details</h3><p class="s">The Event Organize report has not been submitted yet.</p></div>'}
${art ? `<div class="card"><h3>Generated article / report</h3>${art.headline ? `<h4>${esc(art.headline)}</h4>` : ""}${(art.sections || []).map(s => `<h4>${esc(s.heading || "")}</h4><p>${esc(s.body || "").replace(/\n/g, "<br>")}</p>`).join("")}${art.highlights?.length ? `<h4>Highlights</h4><ul>${art.highlights.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}</div>` : ""}
<div class="card"><h3>Media</h3>${files.length ? files.map(([l, v]) => `<p><b>${esc(l)}</b></p><div class="bv-media">${v.map(fl => isImg(fl) ? `<figure><img data-fid="${esc(fl.id)}" alt="${esc(fl.name)}"><figcaption>${esc(fl.name)}</figcaption></figure>` : `<button class="g sm" onclick="backFile('${esc(fl.id)}','${esc(fl.name)}')">⬇ ${esc(fl.name)}</button>`).join("")}</div>`).join("") : '<p class="s">No photographs or documents uploaded.</p>'}</div>
${sec("Submission & review information", row("Submitted by", esc(x.by)) + row("Submitter email", esc(x.email)) + row("Submitted date", bvDate(x.subAt)) + row("Last updated", e.updatedAt ? bvDate(e.updatedAt) + " by " + esc(e.updatedBy || "") : "—") + row("Current status", badge(e.status)) + row("Approved", e.approvedAt ? bvDate(e.approvedAt) + " by " + esc(e.approvedBy || "") : "—") + row("Rejected", e.rejectedAt ? bvDate(e.rejectedAt) + " by " + esc(e.rejectedBy || "") : "—") + row("Rejection reason", esc(e.rejectionReason || e.remark || "")) + row("Website status", e.websiteStatus === "Published" ? "Published" : "Not Published") + row("Website URL", e.websiteUrl ? `<a href="${esc(e.websiteUrl)}" target="_blank" rel="noopener">Open Website</a>` : "") + row("Published", e.publishedAt ? bvDate(e.publishedAt) + " by " + esc(e.publishedBy || "") : "—"))}
<div class="card"><h3>History</h3><ul class="lg">${(e.hist || []).slice().reverse().map(([t, m]) => `<li>${bvDate(t)} — ${esc(m)}</li>`).join("")}</ul></div>`;
  hydrate($("#app")); bvLog("Submission Viewed", e.title, e.id);
}
async function backFile(id, name) { try { const v = await fGet(id); if (!v) throw 0; const a = document.createElement("a"); a.href = URL.createObjectURL(v.blob); a.download = name; a.click() } catch (er) { bvToast("Unable to download this file. Please try again.", true) } }
function backDownload(id) { location.hash = "#/back/event/" + id; setTimeout(() => print(), 600) }
function backEdit(id) {
  const x = myEv().map(bvSub).find(y => y.e.id === id); if (!x) return backView("submissions");
  const e = x.e, r = x.rec, h = H.find(k => k[0] === "evo");
  const inp = (k, l, v, t = "text") => `<div><label for="be-${k}">${l}</label><input id="be-${k}" type="${t}" value="${esc(v ?? "")}"></div>`;
  const recF = r ? h[2].map(s => s.split("|")).filter(([, t]) => !["sec", "fu", "fp"].includes(t)) : [];
  $("#app").innerHTML = `<p><a href="#/back/event/${esc(e.id)}">← Back to submission</a></p><h2>Edit submission</h2><p class="s"><code>${esc(e.num)}</code> · ${esc(dn(e.dept))}</p><div class="card"><h3>Event information</h3><div class="row">${inp("title", "Event title *", e.title)}${inp("type", "Event type", e.type)}${inp("venue", "Venue", e.venue)}${inp("mode", "Mode", e.mode)}${inp("date", "Event date *", e.date, "date")}${inp("dateTo", "End date", e.dateTo, "date")}${inp("faculty", "Faculty / Organizer", e.faculty)}${inp("conv", "Convener", e.conv)}${inp("coconv", "Co-convener", e.coconv)}${inp("secy", "Organizing secretary", e.secy)}${inp("sp1", "Speaker 1", (e.speakers || [])[0])}${inp("sp2", "Speaker 2", (e.speakers || [])[1])}</div></div>${recF.length ? `<div class="card"><h3>Event Organize report</h3>${recF.map(([l, t], i) => `<label for="ber-${i}">${esc(l)}</label>${t === "ta" || String(r.data[l] || "").length > 80 ? `<textarea id="ber-${i}" rows="4">${esc(r.data[l] || "")}</textarea>` : `<input id="ber-${i}" type="${t === "n" ? "number" : t === "d" ? "date" : "text"}" ${t === "n" ? 'min="0"' : ""} value="${esc(r.data[l] || "")}">`}`).join("")}</div>` : ""}<button id="be-save">Save changes</button> <a href="#/back/event/${esc(e.id)}"><button class="g">Cancel</button></a>`;
  $("#be-save").onclick = async () => {
    const v = k => $("#be-" + k).value.trim();
    if (!v("title") || !v("date")) return bvToast("Event title and event date are required.", true);
    if (v("dateTo") && v("dateTo") < v("date")) return bvToast("End date cannot be before the event date.", true);
    for (const [i, [l, t]] of recF.entries()) if (t === "n" && $("#ber-" + i).value !== "" && (+$("#ber-" + i).value < 0 || !Number.isFinite(+$("#ber-" + i).value))) return bvToast(`${l} must be a positive number.`, true);
    $("#be-save").disabled = true; $("#be-save").textContent = "Saving...";
    Object.assign(e, { title: v("title"), type: v("type"), venue: v("venue"), mode: v("mode"), date: v("date"), dateTo: v("dateTo"), faculty: v("faculty"), conv: v("conv"), coconv: v("coconv"), secy: v("secy"), speakers: [v("sp1"), v("sp2")], updatedAt: new Date().toISOString(), updatedBy: window.REALU.name });
    if (r) { recF.forEach(([l], i) => r.data[l] = $("#ber-" + i).value.trim()); r.updatedAt = e.updatedAt; r.updatedBy = e.updatedBy }
    e.hist.push([e.updatedAt, "Edited by " + window.REALU.name + " (BACK VIEW)"]);
    try { await save(); bvLog("Submission Edited", e.title, e.id); bvToast("Submission saved successfully."); location.hash = "#/back/event/" + e.id } catch (er) { bvToast("Unable to save changes. Please try again.", true); $("#be-save").disabled = false; $("#be-save").textContent = "Save changes" }
  };
}
async function backDecide(id, ok) {
  const e = myEv().find(x => x.id === id); if (!e || !["PENDING", "SUBMITTED"].includes(e.status)) return;
  const now = new Date().toISOString(), who = window.REALU.name, verify = e.status === "SUBMITTED";
  if (ok) { if (!confirm(`${verify ? "Verify and complete" : "Approve"} "${e.title}"?`)) return; e.status = verify ? "COMPLETED" : "APPROVED"; e.approvedBy = who; e.approvedAt = now; e.hist.push([now, (verify ? "Completion verified" : "Approved") + " by " + who + " (BACK VIEW)"]) }
  else { const reason = prompt("Reason for rejection (optional):", ""); if (reason === null) return; e.status = verify ? "CRETURNED" : "REJECTED"; e.rejectedBy = who; e.rejectedAt = now; e.rejectionReason = reason.trim().slice(0, 1000); e.remark = e.rejectionReason; e.hist.push([now, (verify ? "Event Organize returned" : "Rejected") + " by " + who + (e.rejectionReason ? ": " + e.rejectionReason : "")]) }
  bvToast(ok ? "Approving..." : "Rejecting...");
  try { await save(); bvLog(ok ? "Submission Approved" : "Submission Rejected", e.title + (e.rejectionReason && !ok ? " — " + e.rejectionReason : ""), e.id); bvToast(ok ? "Submission approved successfully." : "Submission rejected."); route() } catch (er) { bvToast("Unable to update the submission. Please try again.", true) }
}
async function backPublish(id) {
  const e = myEv().find(x => x.id === id); if (!e || !["APPROVED", "COMPLETED"].includes(e.status)) return;
  const url = prompt("Website URL where this event is published (leave empty to mark Not Published):", e.websiteUrl || ""); if (url === null) return;
  const u = url.trim(); if (u) { try { const p = new URL(u); if (!/^https?:$/.test(p.protocol)) throw 0 } catch (er) { return bvToast("Please enter a valid website address starting with https://", true) } }
  const now = new Date().toISOString(); e.websiteUrl = u; e.websiteStatus = u ? "Published" : "Not Published"; if (u) { e.publishedAt = now; e.publishedBy = window.REALU.name } e.hist.push([now, (u ? "Published to website by " : "Marked not published by ") + window.REALU.name]);
  bvToast("Publishing...");
  try { await save(); bvLog(u ? "Submission Published" : "Submission Unpublished", e.title + (u ? " — " + u : ""), e.id); bvToast(u ? "Website link saved." : "Marked as not published."); route() } catch (er) { bvToast("Unable to save the website link. Please try again.", true) }
}
async function backDelete(id) {
  if (!bvSU()) return bvToast("Only a Super Admin can delete submissions.", true);
  const e = S.events.find(x => x.id === id); if (!e) return;
  if (!confirm("Are you sure you want to delete this submission?\n\n" + e.title + "\n\nThis cannot be undone.")) return;
  try { const r = await window.__ACU.deleteSubmission(id); S.events = S.events.filter(x => x.id !== id); if (r.recId) S.recs = S.recs.filter(x => x.id !== r.recId); await save(); bvLog("Submission Deleted", e.title, id); bvToast("Submission deleted."); location.hash = "#/back/submissions"; route() } catch (er) { bvToast(er.message || "Unable to delete the submission.", true) }
}
function backUsers() {
  const me = window.REALU, rows = S.users.filter(u => u.role !== "su" || bvSU()).sort((a, b) => a.name.localeCompare(b.name));
  const stat = u => ({ active: '<span class="b ok">Active</span>', pending: '<span class="b wa">Pending activation</span>', disabled: '<span class="b er">Disabled</span>' }[u.status] || '<span class="b">Unknown</span>');
  $("#app").innerHTML = `<h2>User Management</h2><p class="s">Invite users and manage roles.</p><p><a class="back-command" href="#/users">+ Invite new user</a></p><div class="back-table"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>College / Department</th><th>Status</th><th>Created</th><th>Last login</th><th>Actions</th></tr></thead><tbody>${rows.map(u => { const self = u.id === me.id, prot = u.role === "su" && !bvSU(); return `<tr><td><strong>${esc(u.name)}</strong>${self ? " <small>(you)</small>" : ""}</td><td>${esc(u.email || "—")}</td><td>${RN[u.role] || esc(u.role)}</td><td>${u.college ? esc(cn(u.college)) : "University"}${u.dept ? "<br><small>" + esc(dn(u.dept)) + "</small>" : ""}</td><td>${stat(u)}</td><td>${bvDate(u.createdAt)}</td><td>${u.lastLogin ? bvDate(u.lastLogin) : "Never"}</td><td class="bv-actions">${self || prot ? "<small>Protected</small>" : `<a class="g sm bv-link" href="#/users/edit/${esc(u.id)}">Edit role</a><button class="g sm" onclick="backDisable('${esc(u.id)}',${u.status !== "disabled"})">${u.status === "disabled" ? "Enable" : "Disable"}</button>${u.status === "pending" ? `<button class="g sm" onclick="backResend('${esc(u.id)}')">Resend invite</button>` : ""}${bvSU() ? `<button class="r sm" onclick="backDelUser('${esc(u.id)}')">Delete</button>` : ""}`}</td></tr>` }).join("")}</tbody></table></div>`;
}
async function backDisable(id, dis) { const u = S.users.find(x => x.id === id); if (!u || !confirm(`${dis ? "Disable" : "Enable"} ${u.name}?`)) return; try { await window.__ACU.setUserDisabled(id, dis); u.status = dis ? "disabled" : (u.lastLogin ? "active" : "pending"); bvLog(dis ? "User Disabled" : "User Enabled", u.name + " <" + u.email + ">"); bvToast(dis ? "User disabled." : "User enabled."); backView("users") } catch (er) { bvToast(er.message || "Unable to update the user.", true) } }
async function backResend(id) { const u = S.users.find(x => x.id === id); try { await window.__ACU.resendInvite(id); bvLog("User Invited", "Invitation re-sent to " + (u?.email || id)); bvToast("Invitation sent.") } catch (er) { bvToast(er.message || "Unable to send the invitation.", true) } }
async function backDelUser(id) { const u = S.users.find(x => x.id === id); if (!u || !bvSU() || u.id === window.REALU.id) return; if (!confirm(`Delete the account for ${u.name} (${u.email})? This cannot be undone.`)) return; S.users = S.users.filter(x => x.id !== id); try { await save(); bvToast("User deleted."); backView("users") } catch (er) { bvToast("Unable to delete the user.", true) } }
async function backActivity() {
  $("#app").innerHTML = '<h2>Activity log</h2><p class="s">Loading...</p>';
  try {
    const logs = await window.__ACU.listActivity(500);
    if (location.hash !== "#/back/activity") return;
    $("#app").querySelector(".s").outerHTML = `<p class="s">Every important administrative action, newest first (latest ${logs.length}).</p><div class="back-table"><table><thead><tr><th>When</th><th>User</th><th>Action</th><th>Details</th><th>Submission</th></tr></thead><tbody>${logs.map(l => { const ev = l.submission_id && S.events.find(e => e.id === l.submission_id); return `<tr><td>${bvDate(l.created_at)}</td><td>${esc(l.user_name || (S.users.find(u => u.id === l.user_id) || {}).name || "—")}</td><td><strong>${esc(l.action)}</strong></td><td>${esc(l.description)}</td><td>${ev ? `<a href="#/back/event/${esc(ev.id)}"><code>${esc(ev.num)}</code></a>` : l.submission_id ? "<small>deleted</small>" : "—"}</td></tr>` }).join("") || '<tr><td colspan="5" class="empty">No activity recorded yet.</td></tr>'}</tbody></table></div>`;
  } catch (er) { $("#app").querySelector(".s").textContent = "Unable to load the activity log. Please try again." }
}
