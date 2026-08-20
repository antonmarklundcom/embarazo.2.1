import { adminDb, requireAdmin } from "@/lib/server/admin";
import { decidedQuestions, pendingQuestions } from "@/lib/server/questions";
import { AdminQuestionActions } from "@/components/admin/AdminQuestionActions";

// K20 — the moderation queue (§5 D5).
//
// This page is the whole reason the feature is safe to ship: nothing a user
// writes is public until it has been through here. There is no moderator role
// and no second reviewer — the panel is one person, and that is a scale
// decision, not an oversight (D4: a capability module gets built when a second
// privileged human exists).
//
// It is also the one admin screen that shows text a user wrote. Everything
// else in `/admin` is metadata by construction, and `admin.test.ts` fails the
// build if `payload` is named anywhere under this directory. That test still
// holds here: `communityQuestions.question` is not `syncRecords.payload`, it is
// text submitted *to be answered by us*, which is the only kind of user writing
// this panel can see. The footer in the layout says "solo datos de cuenta";
// this page is the documented exception, and it says so on screen.

export const dynamic = "force-dynamic";

function formatDate(value: Date): string {
  return new Date(value).toLocaleString("es-PY", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Days between then and now, for the "waiting since" line. */
function daysWaiting(since: Date): number {
  return Math.floor((Date.now() - new Date(since).getTime()) / 86_400_000);
}

export default async function AdminQuestionsPage() {
  await requireAdmin();
  const database = adminDb();

  const pending = database ? await pendingQuestions(database) : [];
  const published = database ? await decidedQuestions(database) : [];

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-lg font-black text-ink">Preguntas de usuarias</h1>
        <p className="mt-1 text-sm text-muted">
          Nada de esto es público hasta que vos lo publiques. Lo que publicás se
          muestra en <strong>/preguntas</strong> sin el nombre de quien preguntó.
        </p>
        <p className="mt-2 rounded-tile bg-sand-bg px-3 py-2 text-xs leading-relaxed text-sand-text">
          Esta es la única pantalla del panel que muestra texto escrito por una
          usuaria — porque te lo escribió a vos, para que lo respondas. Sigue
          sin mostrar nada de sus registros de salud.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase tracking-[1.6px] text-petrol">
          Esperando respuesta ({pending.length})
        </h2>

        {pending.length === 0 && (
          <p className="rounded-card border border-line bg-white p-4 text-sm text-muted">
            No hay preguntas esperando.
          </p>
        )}

        {pending.map((row) => {
          const waiting = daysWaiting(row.createdAt);
          return (
            <article
              key={row.id}
              className="rounded-card border border-line bg-white p-4 shadow-soft"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs text-muted">{formatDate(row.createdAt)}</p>
                {/* A queue is a promise with a clock on it. Saying how long
                    she has waited is what stops the interesting question that
                    arrived this morning from jumping her. */}
                {waiting >= 3 && (
                  <p className="shrink-0 rounded-full bg-terracotta/10 px-2.5 py-0.5 text-xs font-bold text-terracotta">
                    Esperando {waiting} días
                  </p>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                {row.question}
              </p>
              <AdminQuestionActions questionId={row.id} />
            </article>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase tracking-[1.6px] text-petrol">
          Publicadas
        </h2>
        <p className="text-xs text-muted">
          Se pueden corregir: al actualizar, se reemplaza la respuesta que está
          publicada.
        </p>

        {published.length === 0 && (
          <p className="rounded-card border border-line bg-white p-4 text-sm text-muted">
            Todavía no publicaste ninguna.
          </p>
        )}

        {published.map((row) => (
          <article
            key={row.id}
            className="rounded-card border border-line bg-white p-4 shadow-soft"
          >
            <p className="text-[15px] font-extrabold leading-snug text-ink">
              {row.question}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink/90">
              {row.answer}
            </p>
            <AdminQuestionActions questionId={row.id} answer={row.answer} />
          </article>
        ))}
      </section>
    </div>
  );
}
