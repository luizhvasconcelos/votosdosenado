"use client";

import { ChatCircle, Heart, ThumbsDown, ThumbsUp } from "@phosphor-icons/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { CommunityComment } from "@/lib/types";

type Target = "senador" | "votacao";
type Reaction = "curtir" | "aprovar" | "desaprovar";

function visitorId() {
  const stored = localStorage.getItem("votosdosenado-visitor");
  if (stored) return stored;
  const created = crypto.randomUUID();
  localStorage.setItem("votosdosenado-visitor", created);
  return created;
}

export function CommentSection({ target, targetId, initialComments }: { target: Target; targetId: number; initialComments: CommunityComment[] }) {
  const [comments, setComments] = useState(initialComments);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<{ id: number; author: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingReaction, setPendingReaction] = useState("");
  const [message, setMessage] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`/backend/api/v1/comentarios/${target}/${targetId}?visitor_id=${visitorId()}`)
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(setComments)
      .catch(() => setMessage("Não foi possível atualizar os comentários agora."));
  }, [target, targetId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/backend/api/v1/comentarios/${target}/${targetId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autor_nome: author, corpo: body, visitor_id: visitorId(), parent_id: reply?.id || null }),
      });
      if (!response.ok) throw new Error("Revise o nome e o comentário antes de publicar.");
      setComments(await response.json());
      setBody("");
      setReply(null);
      setMessage("Comentário publicado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível publicar. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  async function react(commentId: number, reaction: Reaction) {
    const key = `${commentId}-${reaction}`;
    setPendingReaction(key);
    setMessage("");
    try {
      const response = await fetch(`/backend/api/v1/reacoes/comentarios/${commentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitor_id: visitorId(), tipo: reaction }),
      });
      if (!response.ok) throw new Error();
      setComments(await response.json());
    } catch {
      setMessage("Não foi possível registrar sua reação. Tente novamente.");
    } finally {
      setPendingReaction("");
    }
  }

  function answer(comment: CommunityComment) {
    setReply({ id: comment.id, author: comment.autor_nome });
    textarea.current?.focus();
  }

  return <section className="community-section" aria-labelledby={`community-${target}-${targetId}`}>
    <div className="community-heading">
      <div><span>Participação da comunidade</span><h2 id={`community-${target}-${targetId}`}>Comentários</h2><p>Converse sobre os dados com respeito. Comentários são opiniões dos usuários e não conteúdo oficial.</p></div>
      <strong>{comments.reduce((total, comment) => total + 1 + comment.respostas.length, 0)} contribuições</strong>
    </div>
    <form className="comment-form" onSubmit={submit}>
      {reply && <div className="reply-context"><span>Respondendo a <strong>{reply.author}</strong></span><button type="button" onClick={() => setReply(null)}>Cancelar resposta</button></div>}
      <div className="comment-fields">
        <label htmlFor={`comment-author-${target}-${targetId}`}>Seu nome <span aria-hidden="true">*</span><input id={`comment-author-${target}-${targetId}`} value={author} onChange={event => setAuthor(event.target.value)} minLength={2} maxLength={60} autoComplete="name" required /></label>
        <label htmlFor={`comment-body-${target}-${targetId}`}>Comentário <span aria-hidden="true">*</span><textarea ref={textarea} id={`comment-body-${target}-${targetId}`} value={body} onChange={event => setBody(event.target.value)} minLength={2} maxLength={1200} rows={4} required onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") event.currentTarget.form?.requestSubmit(); }} /></label>
      </div>
      <div className="comment-submit"><small>{body.length}/1.200 · Ctrl/⌘ + Enter para publicar</small><button className="button primary" type="submit" disabled={pending}>{pending ? "Publicando…" : reply ? "Publicar resposta" : "Publicar comentário"}</button></div>
    </form>
    <p className="comment-status" aria-live="polite">{message}</p>
    {comments.length ? <div className="comment-list">{comments.map(comment => <CommentCard key={comment.id} comment={comment} onReply={answer} onReact={react} pendingReaction={pendingReaction} />)}</div> : <div className="community-empty"><ChatCircle aria-hidden="true" /><strong>Comece a conversa</strong><p>Seja a primeira pessoa a comentar sobre esta página.</p></div>}
  </section>;
}

function CommentCard({ comment, onReply, onReact, pendingReaction, reply = false }: { comment: CommunityComment; onReply: (comment: CommunityComment) => void; onReact: (id: number, reaction: Reaction) => void; pendingReaction: string; reply?: boolean }) {
  const actions: Array<{ type: Reaction; label: string; icon: typeof Heart }> = [
    { type: "curtir", label: "Curtir", icon: Heart },
    { type: "aprovar", label: "Aprovar", icon: ThumbsUp },
    { type: "desaprovar", label: "Desaprovar", icon: ThumbsDown },
  ];
  return <article className={`comment-card${reply ? " is-reply" : ""}`}>
    <header><span className="comment-avatar" aria-hidden="true">{comment.autor_nome.slice(0, 1).toLocaleUpperCase("pt-BR")}</span><div><strong>{comment.autor_nome}</strong><time dateTime={comment.criado_em}>{new Date(comment.criado_em).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</time></div></header>
    <p>{comment.corpo}</p>
    <footer>{actions.map(action => {
      const Icon = action.icon;
      const active = comment.reacoes_visitante.includes(action.type);
      const busy = pendingReaction === `${comment.id}-${action.type}`;
      return <button key={action.type} type="button" className={active ? "active" : ""} aria-pressed={active} aria-label={`${action.label} comentário de ${comment.autor_nome}`} disabled={busy} onClick={() => onReact(comment.id, action.type)}><Icon weight={active ? "fill" : "regular"} aria-hidden="true" /> {action.label} <span>{comment.reacoes[action.type]}</span></button>;
    })}<button type="button" onClick={() => onReply(comment)}><ChatCircle aria-hidden="true" /> Responder</button></footer>
    {comment.respostas.length > 0 && <div className="comment-replies">{comment.respostas.map(item => <CommentCard key={item.id} comment={item} onReply={onReply} onReact={onReact} pendingReaction={pendingReaction} reply />)}</div>}
  </article>;
}
