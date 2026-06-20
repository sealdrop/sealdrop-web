import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import "../landing.css";
import { LandingNav } from "../components/LandingNav";
import { LandingFooter } from "../components/LandingFooter";
import { TurnstileWidget, turnstileEnabled } from "../components/TurnstileWidget";
import { joinProWaitlist, type ProWaitlistBody } from "../lib/api";
import { usePageTitle } from "../lib/use-page-title";

const copy = {
  cs: {
    title: "SealDrop Pro — bezpečné podklady od klientů",
    kicker: "Připravujeme pro české profesionály",
    heading: "Jeden bezpečný odkaz pro všechny klientské podklady.",
    intro: "Klient otevře váš stálý odkaz, nahraje dokumenty bez registrace a hotovo. Soubory se zašifrují u něj v prohlížeči — přečíst je můžete jen vy.",
    price: "4 € měsíčně",
    annual: "nebo 36 € ročně",
    proposed: "Navrhovaná cena · produkt je ve vývoji",
    cta: "Mám zájem o pilot",
    noCard: "Bez platby. Ozveme se pouze kvůli výzkumu a pilotu.",
    features: [
      ["Stálý odkaz", "Například sealdrop.io/drop/vase-kancelar. Už neposíláte nový odkaz každému klientovi."],
      ["Žádný účet pro klienta", "Klient nic neinstaluje, nevytváří heslo a nevidí soubory ostatních."],
      ["Skutečné koncové šifrování", "Názvy i obsah souborů jsou uzamčeny ještě před odesláním."],
      ["Automatický úklid", "Zvolíte dobu platnosti. Po vypršení se zašifrovaná data smažou."],
    ],
    mockTitle: "Nahrát podklady",
    mockBusiness: "Novák Účetnictví",
    mockText: "Nahrajte prosím podklady k měsíční uzávěrce.",
    mockDrop: "Přetáhněte soubory sem",
    mockSecure: "Zašifrováno před odesláním",
    formTitle: "Pomozte rozhodnout, zda má SealDrop Pro vzniknout.",
    formText: "Hledáme první účetní a daňové poradce pro krátký e-mailový průzkum a pilot.",
    email: "Pracovní e-mail",
    role: "Vaše profese",
    roleOptions: ["Vyberte", "Účetní", "Daňový poradce", "Vedení účetnictví", "Jiná profese"],
    frequency: "Jak často od klientů přijímáte dokumenty?",
    frequencyOptions: ["Vyberte", "Každý týden", "Každý měsíc", "Každé čtvrtletí", "Méně často"],
    consent: "Souhlasím, aby mě SealDrop kontaktoval kvůli výzkumu a pilotnímu provozu. Souhlas mohu kdykoli odvolat.",
    submit: "Přidat se k pilotu",
    sending: "Odesílám…",
    success: "Děkujeme. Až budeme vybírat první účetní pro pilot, ozveme se e-mailem.",
    error: "Formulář se nepodařilo odeslat. Zkuste to prosím znovu.",
    privacy: "E-mail použijeme pouze pro tento výzkum a pilot. Neaktivní záznamy smažeme nejpozději do 90 dnů.",
  },
  en: {
    title: "SealDrop Pro — secure client uploads",
    kicker: "In development for independent professionals",
    heading: "One secure link for every client document.",
    intro: "Your client opens your permanent link and uploads without an account. Files are encrypted in their browser, and only you can open them.",
    price: "€4 per month", annual: "or €36 per year", proposed: "Proposed price · product in development",
    cta: "Join the pilot", noCard: "No payment. We will only contact you about research and the pilot.",
    features: [
      ["A permanent link", "Use one professional address instead of creating a new request for every client."],
      ["No client account", "Clients install nothing, create no password, and cannot see anyone else's files."],
      ["Real end-to-end encryption", "File names and contents are locked before they leave the client's browser."],
      ["Automatic cleanup", "Choose a retention period and encrypted data disappears when it expires."],
    ],
    mockTitle: "Upload documents", mockBusiness: "Novák Accounting", mockText: "Please upload the documents for your monthly close.",
    mockDrop: "Drop files here", mockSecure: "Encrypted before upload",
    formTitle: "Help decide whether SealDrop Pro should exist.",
    formText: "We are looking for accountants and tax advisers for short email research and an early pilot.",
    email: "Work email", role: "Your profession",
    roleOptions: ["Select", "Accountant", "Tax adviser", "Bookkeeper", "Other"],
    frequency: "How often do clients send you documents?",
    frequencyOptions: ["Select", "Every week", "Every month", "Every quarter", "Less often"],
    consent: "SealDrop may contact me about this research and pilot. I can withdraw consent at any time.",
    submit: "Join the pilot", sending: "Sending…",
    success: "Thank you. We will email you when we select the first pilot participants.",
    error: "The form could not be submitted. Please try again.",
    privacy: "We use your email only for this research and pilot. Inactive records are deleted within 90 days.",
  },
  mk: {
    title: "SealDrop Pro — безбедно примање датотеки од клиенти",
    kicker: "Во развој за независни професионалци",
    heading: "Еден безбеден линк за сите документи од клиентите.",
    intro: "Клиентот го отвора вашиот постојан линк и прикачува документи без регистрација. Датотеките се шифрираат во неговиот прелистувач — само вие можете да ги отворите.",
    price: "4 € месечно",
    annual: "или 36 € годишно",
    proposed: "Предложена цена · производот е во развој",
    cta: "Приклучи се на пилотот",
    noCard: "Без плаќање. Ќе ве контактираме само за истражувањето и пилотот.",
    features: [
      ["Постојан линк", "Користете една професионална адреса наместо да создавате ново барање за секој клиент."],
      ["Без сметка за клиентот", "Клиентите не инсталираат ништо, не создаваат лозинка и не можат да ги видат туѓите датотеки."],
      ["Вистинско шифрирање од крај до крај", "Имињата и содржината на датотеките се заклучуваат пред да го напуштат прелистувачот на клиентот."],
      ["Автоматско бришење", "Изберете период на чување, а шифрираните податоци исчезнуваат кога тој ќе истече."],
    ],
    mockTitle: "Прикачи документи",
    mockBusiness: "Новак Сметководство",
    mockText: "Ве молиме прикачете ги документите за месечната пресметка.",
    mockDrop: "Повлечете ги датотеките тука",
    mockSecure: "Шифрирано пред испраќање",
    formTitle: "Помогнете да одлучиме дали треба да постои SealDrop Pro.",
    formText: "Бараме сметководители и даночни советници за кратко истражување по е-пошта и ран пилот.",
    email: "Службена е-пошта",
    role: "Вашата професија",
    roleOptions: ["Изберете", "Сметководител", "Даночен советник", "Книговодител", "Друго"],
    frequency: "Колку често примате документи од клиенти?",
    frequencyOptions: ["Изберете", "Секоја недела", "Секој месец", "Секое тримесечје", "Поретко"],
    consent: "Се согласувам SealDrop да ме контактира за ова истражување и пилотот. Можам да ја повлечам согласноста во секое време.",
    submit: "Приклучи се на пилотот",
    sending: "Се испраќа…",
    success: "Ви благодариме. Ќе ви испратиме е-пошта кога ќе ги избираме првите учесници во пилотот.",
    error: "Формуларот не можеше да се испрати. Обидете се повторно.",
    privacy: "Е-поштата ја користиме само за ова истражување и пилотот. Неактивните записи се бришат во рок од 90 дена.",
  },
} as const;

export function ProPage() {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === "cs" || i18n.resolvedLanguage === "mk" ? i18n.resolvedLanguage : "en";
  const c = copy[lang];
  usePageTitle(c.title);
  const source = useMemo(() => new URLSearchParams(window.location.search).get("ref") === "accounting-outreach" ? "accounting-outreach" : "pro-page", []);
  const [token, setToken] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = portalRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let rafId: number;

    function tilt(cx: number, cy: number) {
      const rect = el!.getBoundingClientRect();
      const pcx = rect.left + rect.width / 2;
      const pcy = rect.top + rect.height / 2;
      const dx = (cx - pcx) / rect.width;
      const dy = (cy - pcy) / rect.height;
      const clamp = (value: number, max: number) => Math.max(-max, Math.min(max, value));
      const rotY = clamp(dx * 14, 9);
      const rotX = clamp(-dy * 12, 7);
      el!.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    }

    function onMouseMove(event: MouseEvent) {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => tilt(event.clientX, event.clientY));
    }

    function onTouchMove(event: TouchEvent) {
      const touch = event.touches[0];
      if (!touch) return;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => tilt(touch.clientX, touch.clientY));
    }

    function onTouchEnd() {
      cancelAnimationFrame(rafId);
      el!.style.transform = "";
    }

    document.addEventListener("mousemove", onMouseMove);
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      cancelAnimationFrame(rafId);
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (turnstileEnabled && !token) return;
    const data = new FormData(event.currentTarget);
    setState("sending");
    try {
      await joinProWaitlist({
        email: String(data.get("email")),
        role: String(data.get("role")) as ProWaitlistBody["role"],
        frequency: String(data.get("frequency")) as ProWaitlistBody["frequency"],
        language: lang,
        source,
        contact_consent: true,
        ...(token ? { turnstile_token: token } : {}),
      });
      setState("success");
    } catch { setState("error"); }
  }

  return (
    <div className="l-page l-pro-page">
      <LandingNav />
      <main>
        <section className="l-pro-hero">
          <motion.div className="l-pro-hero__copy" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <p className="l-kicker"><span />{c.kicker}</p>
            <h1>{c.heading}</h1>
            <p className="l-pro-hero__intro">{c.intro}</p>
            <div className="l-pro-price"><strong>{c.price}</strong><span>{c.annual}</span><small>{c.proposed}</small></div>
            <a className="l-btn l-btn--primary" href="#pilot">{c.cta}</a>
            <p className="l-pro-no-card">{c.noCard}</p>
          </motion.div>
          <motion.div ref={portalRef} className="l-pro-portal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.45 }}>
            <div className="l-pro-portal__bar"><i /><i /><i /><span>sealdrop.io/drop/novak</span></div>
            <div className="l-pro-portal__brand">N</div>
            <p className="l-eyebrow">{c.mockBusiness}</p><h2>{c.mockTitle}</h2><p>{c.mockText}</p>
            <div className="l-pro-portal__drop"><strong>{c.mockDrop}</strong><span>PDF · ZIP · XLSX · JPG</span></div>
            <small>◈ {c.mockSecure}</small>
          </motion.div>
        </section>

        <section className="l-pro-features">
          {c.features.map(([title, body]) => <article key={title}><h2>{title}</h2><p>{body}</p></article>)}
        </section>

        <section className="l-pro-pilot" id="pilot">
          <div><p className="l-eyebrow">SealDrop Pro</p><h2>{c.formTitle}</h2><p>{c.formText}</p></div>
          {state === "success" ? <div className="l-pro-success" role="status">{c.success}</div> : (
            <form className="l-pro-form" onSubmit={submit}>
              <label>{c.email}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
              <label>{c.role}<select name="role" required defaultValue=""><option value="" disabled>{c.roleOptions[0]}</option><option value="accountant">{c.roleOptions[1]}</option><option value="tax-advisor">{c.roleOptions[2]}</option><option value="bookkeeper">{c.roleOptions[3]}</option><option value="other">{c.roleOptions[4]}</option></select></label>
              <label>{c.frequency}<select name="frequency" required defaultValue=""><option value="" disabled>{c.frequencyOptions[0]}</option><option value="weekly">{c.frequencyOptions[1]}</option><option value="monthly">{c.frequencyOptions[2]}</option><option value="quarterly">{c.frequencyOptions[3]}</option><option value="rarely">{c.frequencyOptions[4]}</option></select></label>
              <label className="l-pro-consent"><input name="consent" type="checkbox" required /> <span>{c.consent}</span></label>
              <TurnstileWidget onToken={setToken} onExpire={() => setToken("")} />
              {state === "error" && <p className="l-pro-error" role="alert">{c.error}</p>}
              <button className="l-btn l-btn--primary" disabled={state === "sending" || (turnstileEnabled && !token)}>{state === "sending" ? c.sending : c.submit}</button>
              <small>{c.privacy} <a href="/privacy">Privacy</a> · <a href="mailto:pro@sealdrop.io">pro@sealdrop.io</a></small>
            </form>
          )}
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
