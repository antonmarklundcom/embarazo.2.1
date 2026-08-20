"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";

import {
  QUESTION_MAX,
  QUESTION_MIN,
  STATUS_COPY,
  type QuestionStatus,
} from "@/lib/community/questions";
import { fetchAuthStatus } from "@/lib/auth/status";

// K20 — the public half of curated Q&A (§5 D5).
//
// This component reads two endpoints and the split between them is the whole
// privacy design, so it is worth stating here as well as in the routes:
//
//   • `/api/v1/preguntas` — the published Q&A. No session, identical for
//     everyone, cached by the service worker. This is why the section still
//     renders on a bus with no signal.
//   • `/api/v1/mis-preguntas` — her own questions and their status. Reads the
//     session, so it is NetworkOnly and simply absent offline. That is the
//     honest failure: a status is a live fact about a queue, and a cached
//     "en revisión" from last Tuesday would be a worse answer than none.
//
// Nothing here renders an author. There is no name to omit, because the
// server never stores one alongside a published question.

interface PublicQuestion {
  id: string;
  question: string;
  answer: string;
  answeredAt: string | null;
}

interface OwnQuestion {
  id: string;
  question: string;
  status: QuestionStatus;
  answer: string | null;
  createdAt: string;
}

export function CommunityQuestions() {
  const [published, setPublished] = useState<PublicQuestion[]>([]);
  const [mine, setMine] = useState<OwnQuestion[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const fieldId = useId();

  const loadPublished = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/preguntas");
      if (!res.ok) return;
      const body = (await res.json()) as { questions?: PublicQuestion[] };
      setPublished(body.questions ?? []);
    } catch {
      // Offline with nothing cached yet. The static FAQ above is still there,
      // which is the part that answers the questions people ask most.
    }
  }, []);

  const loadMine = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/mis-preguntas", { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { questions?: OwnQuestion[] };
      setMine(body.questions ?? []);
    } catch {
      // Offline. Her status list is a live fact; absent beats stale.
    }
  }, []);

  useEffect(() => {
    void loadPublished();
    void fetchAuthStatus().then((status) => {
      setSignedIn(status.signedIn);
      if (status.signedIn) void loadMine();
    });
  }, [loadPublished, loadMine]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const question = text.trim();
    if (question.length < QUESTION_MIN) {
      setError(`Contanos un poco más (al menos ${QUESTION_MIN} caracteres).`);
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/v1/mis-preguntas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "No pudimos enviarla. Probá de nuevo.");
        return;
      }
      setText("");
      setSent(true);
      await loadMine();
    } catch {
      setError("No pudimos enviarla — parece que no tenés internet ahora.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5">
      <section aria-labelledby="comunidad" className="space-y-3">
        <div>
          <h2 id="comunidad" className="text-base font-extrabold text-ink">
            Preguntas de otras mamás
          </h2>
          <p className="mt-1 text-sm text-muted">
            Preguntas que nos mandaron y respondimos. Se publican sin nombre y
            sin ningún dato de quien preguntó.
          </p>
        </div>

        {published.length === 0 ? (
          <p className="rounded-card border border-line bg-white p-4 text-sm text-muted">
            Todavía no hay preguntas respondidas acá. Si tenés una, mandala —
            las respondemos y las publicamos para que le sirvan a otras.
          </p>
        ) : (
          <ul className="space-y-3">
            {published.map((item) => (
              <li
                key={item.id}
                className="rounded-card bg-white p-4 shadow-soft"
              >
                <p className="text-[15px] font-extrabold leading-snug text-ink">
                  {item.question}
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink/90">
                  {item.answer}
                </p>
                {item.answeredAt && (
                  <p className="mt-2 text-xs text-muted">
                    Respondida por el equipo de Mi Bebé · {item.answeredAt}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Her own questions, with status. Only ever her own. */}
      {mine.length > 0 && (
        <section aria-labelledby="mis-preguntas" className="space-y-3">
          <h2 id="mis-preguntas" className="text-base font-extrabold text-ink">
            Tus preguntas
          </h2>
          <ul className="space-y-3">
            {mine.map((item) => (
              <li
                key={item.id}
                className="rounded-card border border-line bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold leading-snug text-ink">
                    {item.question}
                  </p>
                  <span className="shrink-0 rounded-full bg-sand-bg px-2.5 py-0.5 text-xs font-medium text-sand-text">
                    {STATUS_COPY[item.status].label}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  {STATUS_COPY[item.status].detail}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Ask. Requires an account, and says why rather than hiding. */}
      <section aria-labelledby="preguntar" className="rounded-card bg-white p-4 shadow-soft">
        <h2 id="preguntar" className="text-base font-extrabold text-ink">
          Mandanos tu pregunta
        </h2>

        {signedIn === false ? (
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Para preguntar necesitás una cuenta — así podemos mostrarte la
            respuesta cuando esté lista.{" "}
            <Link href="/cuenta" className="font-bold underline">
              Crear una cuenta
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              La lee el equipo de Mi Bebé. Si le sirve a otras mamás, la
              respondemos y la publicamos acá <strong>sin tu nombre</strong>. No
              se publica nada hasta que la respondamos.
            </p>
            <p className="mt-2 rounded-tile bg-terracotta/5 px-3 py-2 text-xs leading-relaxed text-ink">
              No es una consulta médica y no es urgente-atención: si tenés una
              señal de alarma,{" "}
              <Link href="/emergencia" className="font-bold underline">
                andá a Emergencia
              </Link>
              .
            </p>

            <form onSubmit={submit} className="mt-3">
              <label htmlFor={fieldId} className="sr-only">
                Tu pregunta
              </label>
              <textarea
                id={fieldId}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setSent(false);
                }}
                rows={4}
                maxLength={QUESTION_MAX}
                placeholder="Ej: ¿Puedo tomar tereré frío en el embarazo?"
                className="w-full rounded-tile border border-black/10 bg-cream/50 px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-petrol focus:outline-none"
              />
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-xs text-muted">
                  {text.trim().length}/{QUESTION_MAX}
                </span>
                <button
                  type="submit"
                  disabled={sending || text.trim().length < QUESTION_MIN}
                  className="min-h-[44px] rounded-tile bg-petrol px-4 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
                >
                  {sending ? "Enviando…" : "Enviar pregunta"}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-sm font-semibold text-terracotta">{error}</p>
              )}
              {sent && !error && (
                <p className="mt-2 text-sm font-semibold text-sage">
                  Recibida. Te la respondemos acá cuando la revisemos.
                </p>
              )}
            </form>
          </>
        )}
      </section>
    </div>
  );
}
