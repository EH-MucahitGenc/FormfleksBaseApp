import { useEffect, useState } from 'react';
import { ArrowRight, Braces, Code2, CodeXml, LockKeyhole, RefreshCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

type SyntaxKind = 'keyword' | 'function' | 'string' | 'variable' | 'punctuation' | 'plain';
type SyntaxToken = { value: string; kind: SyntaxKind };

const codeLines: SyntaxToken[][] = [
  [
    { value: 'const ', kind: 'keyword' },
    { value: 'improveFormfleks', kind: 'function' },
    { value: ' = ', kind: 'punctuation' },
    { value: 'async ', kind: 'keyword' },
    { value: '() => {', kind: 'punctuation' },
  ],
  [
    { value: '  await ', kind: 'keyword' },
    { value: 'optimize', kind: 'function' },
    { value: '(', kind: 'punctuation' },
    { value: '"approval-engine"', kind: 'string' },
    { value: ');', kind: 'punctuation' },
  ],
  [
    { value: '  await ', kind: 'keyword' },
    { value: 'secure', kind: 'function' },
    { value: '(', kind: 'punctuation' },
    { value: '"workflow-data"', kind: 'string' },
    { value: ');', kind: 'punctuation' },
  ],
  [
    { value: '  const ', kind: 'keyword' },
    { value: 'release', kind: 'variable' },
    { value: ' = ', kind: 'punctuation' },
    { value: 'await ', kind: 'keyword' },
    { value: 'testAll', kind: 'function' },
    { value: '();', kind: 'punctuation' },
  ],
  [
    { value: '  ', kind: 'plain' },
    { value: 'deploy', kind: 'function' },
    { value: '({ ', kind: 'punctuation' },
    { value: 'status', kind: 'variable' },
    { value: ': ', kind: 'punctuation' },
    { value: '"ready"', kind: 'string' },
    { value: ' });', kind: 'punctuation' },
  ],
  [{ value: '};', kind: 'punctuation' }],
  [
    { value: 'improveFormfleks', kind: 'function' },
    { value: '();', kind: 'punctuation' },
  ],
];

const lineLengths = codeLines.map((line) => line.reduce((total, token) => total + token.value.length, 0));
const totalCodeCharacters = lineLengths.reduce((total, length) => total + length + 1, 0) - 1;
const lineStarts = lineLengths.map((_, lineIndex) =>
  lineLengths.slice(0, lineIndex).reduce((total, length) => total + length + 1, 0),
);
const tokenStarts = codeLines.map((line) =>
  line.map((_, tokenIndex) => line.slice(0, tokenIndex).reduce((total, token) => total + token.value.length, 0)),
);

function useLoopingTypewriter() {
  const [visibleCharacters, setVisibleCharacters] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? totalCodeCharacters
      : 0,
  );

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) {
      return;
    }

    let currentCharacter = 0;
    let timer: ReturnType<typeof setTimeout>;

    const typeNextCharacter = () => {
      currentCharacter += 1;
      setVisibleCharacters(currentCharacter);

      if (currentCharacter >= totalCodeCharacters) {
        timer = setTimeout(() => {
          currentCharacter = 0;
          setVisibleCharacters(0);
          timer = setTimeout(typeNextCharacter, 500);
        }, 2200);
        return;
      }

      const isLineBreak = codeLines.some((_, index) => {
        const lineEnd = lineLengths.slice(0, index + 1).reduce((sum, length) => sum + length + 1, 0);
        return currentCharacter === lineEnd;
      });
      timer = setTimeout(typeNextCharacter, isLineBreak ? 180 : 34);
    };

    timer = setTimeout(typeNextCharacter, 650);
    return () => clearTimeout(timer);
  }, []);

  return visibleCharacters;
}

function SyntaxCode({ visibleCharacters }: { visibleCharacters: number }) {
  return (
    <div className="mtv2-code" aria-label="Formfleks bakım kodu yazılıyor">
      {codeLines.map((line, lineIndex) => {
        const currentLineStart = lineStarts[lineIndex];
        const lineLength = lineLengths[lineIndex];
        const visibleInLine = Math.max(0, Math.min(lineLength, visibleCharacters - currentLineStart));
        const cursorIsHere = visibleCharacters >= currentLineStart && visibleCharacters <= currentLineStart + lineLength;

        return (
          <div key={lineIndex} className="mtv2-code-line">
            <span className="mtv2-line-number">{String(lineIndex + 1).padStart(2, '0')}</span>
            <span className="mtv2-line-content">
              {line.map((token, tokenIndex) => {
                const tokenVisibleLength = Math.max(0, Math.min(token.value.length, visibleInLine - tokenStarts[lineIndex][tokenIndex]));
                return (
                  <span key={`${lineIndex}-${tokenIndex}`} className={`mtv2-syntax-${token.kind}`}>
                    {token.value.slice(0, tokenVisibleLength)}
                  </span>
                );
              })}
              {cursorIsHere && <span className="mtv2-cursor" aria-hidden="true" />}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DeveloperStation({
  x,
  id,
  skin,
  shirt,
  hair,
  accessory,
  delay,
}: {
  x: number;
  id: string;
  skin: string;
  shirt: string;
  hair: 'bun' | 'curly' | 'long';
  accessory?: 'plant' | 'coffee';
  delay: string;
}) {
  return (
    <g transform={`translate(${x} 0)`}>
      <ellipse cx="110" cy="236" rx="88" ry="13" fill="#748985" opacity="0.15" />
      <g className="mtv2-person" style={{ animationDelay: delay }}>
        <path d="M76 101c8-25 61-25 70 0l13 62H63z" fill={shirt} />
        <rect x="101" y="78" width="18" height="24" rx="8" fill={skin} />
        <circle cx="110" cy="62" r="28" fill={skin} />
        {hair === 'bun' && (
          <>
            <circle cx="88" cy="35" r="13" fill="#2a211e" />
            <path d="M82 62c0-27 13-40 31-40 22 0 31 17 27 40-14-12-43-14-58 0z" fill="#2a211e" />
          </>
        )}
        {hair === 'curly' && (
          <path d="M81 58c0-24 13-38 31-38 20 0 31 14 29 37-9-4-10-13-17-9-7 4-10-7-17-2-8 5-13-4-26 12z" fill="#392821" />
        )}
        {hair === 'long' && (
          <>
            <path d="M81 61c0-27 13-40 31-40 21 0 31 17 28 39l-3 45-20-13 9-42c-13-5-31-3-45 11z" fill="#4a3025" />
            <path d="M133 51c16 8 21 25 19 48l-18-2z" fill="#4a3025" />
          </>
        )}
      </g>

      <rect x="45" y="93" width="130" height="80" rx="11" fill="#fdfdfd" stroke="#dcd8d5" strokeWidth="2" />
      <rect x="54" y="102" width="112" height="55" rx="6" fill="#16302B" />
      <clipPath id={`screen-${id}`}><rect x="56" y="104" width="108" height="51" rx="5" /></clipPath>
      <g clipPath={`url(#screen-${id})`}>
        <g className="mtv2-editor-scroll mtv2-mini-code" style={{ animationDelay: delay }}>
          {[0, 56].map((offset) => (
            <g key={offset} transform={`translate(0 ${offset})`}>
              <text x="62" y="111"><tspan fill="#F5732B">const</tspan><tspan fill="#9AD8ED"> flow</tspan><tspan fill="#A7B0AD"> = </tspan><tspan fill="#75D6B7">build</tspan><tspan fill="#A7B0AD">();</tspan></text>
              <text x="68" y="121"><tspan fill="#F5732B">await</tspan><tspan fill="#75D6B7"> validate</tspan><tspan fill="#A7B0AD">(flow);</tspan></text>
              <text x="62" y="131"><tspan fill="#9AD8ED">route</tspan><tspan fill="#A7B0AD">.status = </tspan><tspan fill="#75D6B7">&quot;ready&quot;</tspan><tspan fill="#A7B0AD">;</tspan></text>
              <text x="68" y="141"><tspan fill="#F5732B">await</tspan><tspan fill="#75D6B7"> publish</tspan><tspan fill="#A7B0AD">(route);</tspan></text>
              <text x="62" y="151"><tspan fill="#F5732B">return</tspan><tspan fill="#9AD8ED"> workflow</tspan><tspan fill="#A7B0AD">;</tspan></text>
            </g>
          ))}
        </g>
      </g>
      <path d="M94 173h32l5 8H89z" fill="#c9cdce" />
      <rect x="73" y="181" width="74" height="4" rx="2" fill="#8f9696" opacity="0.62" />

      <g className="mtv2-hands" style={{ animationDelay: delay }}>
        <ellipse cx="91" cy="179" rx="9" ry="5" fill={skin} />
        <ellipse cx="129" cy="179" rx="9" ry="5" fill={skin} />
      </g>

      <rect x="16" y="189" width="188" height="10" rx="5" fill="#d8d3cf" />
      <rect x="28" y="198" width="8" height="39" rx="4" fill="#7a6d66" opacity="0.7" />
      <rect x="184" y="198" width="8" height="39" rx="4" fill="#7a6d66" opacity="0.7" />

      {accessory === 'plant' && (
        <g transform="translate(17 145)">
          <path d="M12 28C1 16 5 7 13 17c-2-15 8-21 9-4 7-13 16-7 7 7" fill="none" stroke="#159B78" strokeWidth="4" strokeLinecap="round" />
          <path d="M7 27h24l-3 17H10z" fill="#F5732B" />
        </g>
      )}
      {accessory === 'coffee' && (
        <g transform="translate(173 158)">
          <path d="M0 2h18v19H3z" fill="#fff" stroke="#cfc9c5" strokeWidth="2" />
          <path d="M18 7h4c8 0 8 10 0 10h-4" fill="none" stroke="#cfc9c5" strokeWidth="2" />
          <path className="mtv2-steam" d="M6-3c-3-5 4-6 1-11M13-3c-3-5 4-6 1-11" fill="none" stroke="#8A8681" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}

function OfficeScene() {
  return (
    <svg className="h-full w-full" viewBox="0 0 700 270" role="img" aria-label="Monitörleri başında çalışan üç yazılım geliştirici">
      <defs>
        <linearGradient id="officeWall" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFDF9" />
          <stop offset="1" stopColor="#EDF6F5" />
        </linearGradient>
        <linearGradient id="windowLight" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#FFF" stopOpacity="0.9" />
          <stop offset="1" stopColor="#DDF4ED" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="698" height="250" rx="26" fill="url(#officeWall)" stroke="#E6E1DD" />
      <path d="M88 1h310l146 250H208z" fill="url(#windowLight)" opacity="0.7" />
      <path d="M0 219h700" stroke="#DBE5E2" strokeWidth="2" />
      <circle cx="624" cy="50" r="44" fill="#E2F4EE" opacity="0.55" />
      <circle cx="69" cy="54" r="38" fill="#FFF0E8" opacity="0.7" />

      <DeveloperStation x={5} id="frontend" skin="#8A503A" shirt="#F5732B" hair="bun" accessory="plant" delay="0s" />
      <DeveloperStation x={240} id="quality" skin="#C98562" shirt="#EFB53F" hair="curly" delay="-0.8s" />
      <DeveloperStation x={475} id="backend" skin="#E7A17E" shirt="#159B78" hair="long" accessory="coffee" delay="-1.6s" />
    </svg>
  );
}

export default function Maintenance() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const visibleCodeCharacters = useLoopingTypewriter();

  useEffect(() => {
    if (user?.roles?.includes('Admin') || user?.roles?.includes('SystemAdmin')) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryMessage(null);
    try {
      await api.get('/auth/me');
      navigate('/');
    } catch {
      setRetryMessage('Ekibimiz hâlâ kod başında. Birazdan tekrar deneyebilirsiniz.');
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <main className="mtv2-root relative min-h-screen overflow-hidden bg-[#F4F6F6] text-[#201C1A]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@700;800&display=swap');
        .mtv2-root { font-family: 'Inter', ui-sans-serif, sans-serif; }
        .mtv2-heading { font-family: 'Space Grotesk', 'Outfit', sans-serif; }
        .mtv2-mono, .mtv2-code { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        .mtv2-dots { background-image: radial-gradient(rgba(65,75,73,.12) 1px, transparent 1px); background-size: 26px 26px; mask-image: linear-gradient(to bottom, black, rgba(0,0,0,.55) 80%, transparent); }
        .mtv2-blob { filter: blur(90px); opacity: .48; animation: mtv2Blob 12s ease-in-out infinite alternate; }
        .mtv2-blob-green { animation-delay: -5s; }
        .mtv2-pulse { animation: mtv2Pulse 1.8s ease-in-out infinite; }
        .mtv2-terminal { box-shadow: 0 30px 70px -34px rgba(22,48,43,.48); animation: mtv2Enter .75s cubic-bezier(.16,1,.3,1) both; }
        .mtv2-code { min-height: 128px; font-size: 10px; line-height: 1.58; }
        .mtv2-code-line { display: flex; min-height: 19px; white-space: pre; }
        .mtv2-line-number { width: 28px; flex: none; color: rgba(180,199,194,.32); user-select: none; }
        .mtv2-line-content { color: #B8BEBC; }
        .mtv2-syntax-keyword { color: #F5732B; font-weight: 600; }
        .mtv2-syntax-function, .mtv2-syntax-string { color: #75D6B7; }
        .mtv2-syntax-variable { color: #9AD8ED; }
        .mtv2-syntax-punctuation, .mtv2-syntax-plain { color: #A7B0AD; }
        .mtv2-cursor { display: inline-block; width: 7px; height: 14px; margin-left: 2px; vertical-align: -2px; background: #F5732B; animation: mtv2Cursor .75s steps(1) infinite; }
        .mtv2-status-dot { animation: mtv2Status 1.5s ease-in-out infinite; }
        .mtv2-float-one { animation: mtv2Float 4.2s ease-in-out infinite; }
        .mtv2-float-two { animation: mtv2Float 4.8s ease-in-out infinite reverse; }
        .mtv2-office { box-shadow: 0 24px 60px -42px rgba(37,55,51,.36); }
        .mtv2-person { transform-box: fill-box; transform-origin: center bottom; animation: mtv2Breathe 3.2s ease-in-out infinite; }
        .mtv2-hands { transform-box: fill-box; transform-origin: center; animation: mtv2Type .42s ease-in-out infinite alternate; }
        .mtv2-editor-scroll { animation: mtv2ScrollCode 2.8s linear infinite; }
        .mtv2-mini-code { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 4.35px; font-weight: 600; letter-spacing: -.08px; }
        .mtv2-steam { animation: mtv2Steam 2.2s ease-in-out infinite; }
        .mtv2-retry-message { animation: mtv2Message .4s cubic-bezier(.16,1,.3,1) both; }
        .mtv2-focus:focus-visible { outline: 3px solid rgba(245,115,43,.28); outline-offset: 3px; }
        @keyframes mtv2Blob { from { transform: translate3d(-20px,-12px,0) scale(.94); } to { transform: translate3d(28px,20px,0) scale(1.08); } }
        @keyframes mtv2Pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(245,115,43,.32); } 50% { box-shadow: 0 0 0 7px rgba(245,115,43,0); } }
        @keyframes mtv2Enter { from { opacity: 0; transform: translateY(16px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes mtv2Cursor { 0%,48% { opacity: 1; } 49%,100% { opacity: 0; } }
        @keyframes mtv2Status { 0%,100% { opacity: .45; transform: scale(.9); } 50% { opacity: 1; transform: scale(1.15); } }
        @keyframes mtv2Float { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-9px) rotate(2deg); } }
        @keyframes mtv2Breathe { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes mtv2Type { from { transform: translateY(0) rotate(-1deg); } to { transform: translateY(-3px) rotate(1deg); } }
        @keyframes mtv2ScrollCode { from { transform: translateY(0); } to { transform: translateY(-56px); } }
        @keyframes mtv2Steam { 0%,100% { opacity: .2; transform: translateY(3px); } 50% { opacity: .8; transform: translateY(-3px); } }
        @keyframes mtv2Message { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 639px) { .mtv2-code { min-height: 126px; font-size: 8px; } .mtv2-line-number { width: 23px; } }
        @media (prefers-reduced-motion: reduce) {
          .mtv2-blob, .mtv2-pulse, .mtv2-terminal, .mtv2-cursor, .mtv2-status-dot, .mtv2-float-one, .mtv2-float-two, .mtv2-person, .mtv2-hands, .mtv2-editor-scroll, .mtv2-steam, .mtv2-retry-message { animation: none !important; }
        }
      `}</style>

      <div className="absolute inset-0 bg-[linear-gradient(130deg,#FFF6EE_0%,#F8F7F4_46%,#EAF4F6_100%)]" />
      <div className="mtv2-dots absolute inset-0 opacity-55" />
      <div className="mtv2-blob absolute -left-28 top-[18%] h-[360px] w-[360px] rounded-full bg-[#F5732B]/20" />
      <div className="mtv2-blob mtv2-blob-green absolute -right-24 bottom-[8%] h-[390px] w-[390px] rounded-full bg-[#20A27E]/17" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-12 lg:py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/erkurtlogo.svg" alt="Erkurt Holding" className="h-7 w-auto sm:h-8" />
            <span className="h-6 w-px bg-[#D9D3CE]" />
            <img src="/logo.svg" alt="Formfleks" className="h-8 w-auto sm:h-9" />
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-[#F7CDB8] bg-white/82 px-3.5 py-2 text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#D95F29] shadow-sm backdrop-blur-xl sm:flex">
            <span className="mtv2-pulse h-2 w-2 rounded-full bg-[#F5732B]" />
            Planlı bakım sürüyor
          </div>
        </header>

        <div className="my-auto flex w-full flex-col items-center py-5 text-center sm:py-6">
          <section className="relative z-10 mx-auto max-w-[980px]">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#F7C8AF] bg-white/75 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.19em] text-[#D95F29] shadow-sm backdrop-blur-xl">
              <Code2 className="h-3.5 w-3.5" />
              Planlı bakımdayız
            </div>
            <h1 className="mtv2-heading text-[clamp(3rem,5.2vw,5.4rem)] font-extrabold leading-[.92] tracking-[-.06em] text-[#201C1A]">
              Şu an <span className="text-[#F5732B]">kod başındayız.</span>
            </h1>
            <p className="mx-auto mt-3 max-w-[720px] text-sm font-medium leading-6 text-[#8A8681] sm:text-base sm:leading-7">
              Yazılım ekibimiz Formfleks’i daha hızlı, güvenli ve güçlü hale getiriyor. Çok yakında yeniden buradayız.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={handleRetry} disabled={isRetrying} className="mtv2-focus group inline-flex h-12 items-center gap-2.5 rounded-2xl bg-[#F5732B] px-6 text-sm font-bold text-white shadow-[0_15px_32px_rgba(245,115,43,.28)] transition-all hover:scale-[1.025] hover:shadow-[0_20px_38px_rgba(245,115,43,.34)] disabled:cursor-wait disabled:opacity-65">
                <RefreshCcw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : 'transition-transform group-hover:rotate-90'}`} />
                {isRetrying ? 'Kontrol ediliyor' : 'Yeniden Kontrol Et'}
              </button>
              <Link to="/auth/login" className="mtv2-focus group inline-flex h-12 items-center gap-2 rounded-2xl border border-[#DCD5D0] bg-white/78 px-5 text-sm font-bold text-[#403A37] shadow-sm backdrop-blur-xl transition-all hover:scale-[1.025] hover:border-[#F4B995] hover:bg-white hover:shadow-md">
                <LockKeyhole className="h-4 w-4" />
                Yönetici Girişi
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="mt-2 min-h-5" aria-live="polite">
              {retryMessage && <p className="mtv2-retry-message text-xs font-semibold text-[#A55A34]">{retryMessage}</p>}
            </div>
          </section>

          <section className="relative mx-auto mt-1 w-full max-w-[760px]">
            <div className="mtv2-float-one absolute -left-3 top-10 z-20 hidden items-center justify-center rounded-2xl border border-[#F2D9CC] bg-white/88 p-3 text-[#F5732B] shadow-sm backdrop-blur-xl sm:flex"><Braces className="h-5 w-5" /></div>
            <div className="mtv2-float-two absolute -right-2 top-16 z-20 hidden items-center justify-center rounded-2xl border border-[#D8EDE7] bg-white/88 p-3 text-[#159B78] shadow-sm backdrop-blur-xl sm:flex"><CodeXml className="h-5 w-5" /></div>

            <div className="mtv2-terminal mx-auto w-[min(100%,650px)] overflow-hidden rounded-[24px] border-[9px] border-white bg-[#16302B] text-left shadow-xl ring-1 ring-[#DED9D5]">
              <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F0715A]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#F2BA45]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#59C8A5]" />
                <span className="mtv2-mono ml-2 text-[9px] font-bold uppercase tracking-[0.13em] text-[#75D6B7]">Formfleks / Maintenance</span>
              </div>
              <div className="px-4 py-2.5 sm:px-5 sm:py-3">
                <SyntaxCode visibleCharacters={visibleCodeCharacters} />
                <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                  <span className="mtv2-status-dot h-2 w-2 rounded-full bg-[#75D6B7]" />
                  <span className="mtv2-mono text-[9px] font-semibold text-[#C4D4CF]">Ekip geliştirmeye devam ediyor</span>
                </div>
              </div>
            </div>

            <div className="mtv2-office mx-auto mt-2 h-[205px] w-full overflow-hidden rounded-[28px] bg-white/48 backdrop-blur-sm sm:h-[220px]">
              <OfficeScene />
            </div>
          </section>
        </div>

        <footer className="flex flex-col gap-2 border-t border-[#DCD7D2]/80 pt-4 text-[8px] font-bold uppercase tracking-[0.17em] text-[#8A8681] sm:flex-row sm:items-center sm:justify-between">
          <span>Formfleks Yazılım Geliştirme</span>
          <span>Bakım bitince akış kaldığı yerden devam eder</span>
        </footer>
      </div>
    </main>
  );
}
