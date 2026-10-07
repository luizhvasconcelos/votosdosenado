"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  type ColorMode, getVoteBreakdowns, orderSenators, partyColor, seatPositions,
  spectrumColors, spectrumLabels, spectrumOf, voteColors
} from "@/lib/hemicycle";
import { voteLabels } from "@/lib/presentation";
import type { Senator, VoteCategory, Voting } from "@/lib/types";

interface HoveredSeat {
  senator: Senator;
  x: number;
  y: number;
  category?: VoteCategory;
}

function tooltipTransform(x: number, y: number): string {
  const horizontal = x < 135 ? "0%" : x > 505 ? "-100%" : "-50%";
  return `translate(${horizontal}, ${y < 115 ? "18%" : "-116%"})`;
}

export function Hemicycle({ senators, voting }: { senators: Senator[]; voting?: Voting | null }) {
  const [party, setParty] = useState("");
  const [state, setState] = useState("");
  const [colorMode, setColorMode] = useState<ColorMode>("espectro");
  const [hovered, setHovered] = useState<HoveredSeat | null>(null);
  const [loadedPhoto, setLoadedPhoto] = useState<number | null>(null);
  const votes = useMemo(
    () => new Map(voting?.votos?.map(vote => [vote.senador.id, vote.categoria])),
    [voting]
  );
  const ordered = useMemo(() => orderSenators(senators).slice(0, 81), [senators]);
  const parties = [...new Set(senators.map(senator => senator.partido_sigla))].sort();
  const states = [...new Set(senators.map(senator => senator.uf))].sort();
  const visible = ordered.filter(senator =>
    (!party || senator.partido_sigla === party) && (!state || senator.uf === state)
  );
  const visibleIds = new Set(visible.map(senator => senator.id));
  const breakdowns = voting ? getVoteBreakdowns(visible, voting, colorMode) : [];
  const baseLegend = colorMode === "espectro"
    ? (["esquerda", "centro", "direita"] as const).map(key => ({
        key, label: spectrumLabels[key], color: spectrumColors[key],
        count: visible.filter(senator => spectrumOf(senator) === key).length
      }))
    : parties.map(key => ({
        key, label: key, color: partyColor(key),
        count: visible.filter(senator => senator.partido_sigla === key).length
      })).filter(item => item.count > 0);

  function showTooltip(seat: HoveredSeat) {
    setLoadedPhoto(null);
    setHovered(seat);
  }

  return (
    <section className="hemicycle-card" aria-labelledby="plenaria-title">
      <div className="hemicycle-toolbar">
        <div className="filters" aria-label="Filtros do plenário">
          <label htmlFor="party-filter">Partido
            <select id="party-filter" value={party} onChange={event => setParty(event.target.value)}>
              <option value="">Todos</option>
              {parties.map(item => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label htmlFor="state-filter">Estado
            <select id="state-filter" value={state} onChange={event => setState(event.target.value)}>
              <option value="">Todos</option>
              {states.map(uf => <option key={uf}>{uf}</option>)}
            </select>
          </label>
          <label htmlFor="color-mode">Colorir cadeiras por
            <select id="color-mode" value={colorMode} onChange={event => setColorMode(event.target.value as ColorMode)}>
              <option value="espectro">Espectro político</option>
              <option value="partido">Partido</option>
            </select>
          </label>
          {(party || state) && (
            <button type="button" onClick={() => { setParty(""); setState(""); }}>
              Limpar filtros
            </button>
          )}
        </div>
        <p className="result-count" aria-live="polite"><strong>{visible.length}</strong> de {ordered.length} cadeiras</p>
      </div>

      <p className="hemicycle-help">
        Esquerda à esquerda, centro ao meio e direita à direita. Passe o cursor ou use Tab para identificar cada parlamentar.
      </p>

      <div className="hemicycle-scroll">
        <div className="hemicycle-canvas">
          <svg viewBox="0 0 640 410" role="img" aria-labelledby="plenaria-title plenaria-desc">
            <title id="plenaria-title">Hemiciclo do Senado</title>
            <desc id="plenaria-desc">
              Mapa interativo com parlamentares agrupados por espectro. Em uma votação, a cadeira mantém a cor-base e um ponto menor indica o voto.
            </desc>
            <path className="hemicycle-floor" d="M139 343 A181 181 0 0 1 501 343" />
            {ordered.map((senator, index) => {
              const { x, y } = seatPositions[index];
              const category = votes.get(senator.id);
              const baseColor = colorMode === "espectro"
                ? spectrumColors[spectrumOf(senator)] : partyColor(senator.partido_sigla);
              const isVisible = visibleIds.has(senator.id);
              return (
                <Link
                  key={senator.id}
                  href={`/senadores/${senator.id}`}
                  aria-label={`${senator.nome_parlamentar}, ${senator.partido_sigla}-${senator.uf}, ${spectrumLabels[spectrumOf(senator)]}${category ? `, voto ${voteLabels[category]}` : ""}`}
                  onMouseEnter={() => showTooltip({ senator, x, y, category })}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => showTooltip({ senator, x, y, category })}
                  onBlur={() => setHovered(null)}
                >
                  <g transform={`rotate(${seatPositions[index].rotation} ${x} ${y})`}>
                    <rect className="seat-hit-area" x={x - 14} y={y - 14} width="28" height="28" rx="8" />
                    <rect className="senate-seat" x={x - 9} y={y - 9} width="18" height="18" rx="4.5" fill={baseColor} opacity={isVisible ? 1 : 0.12} />
                  </g>
                  {category && isVisible && <circle className="vote-dot" cx={x + 7} cy={y + 7} r="4.4" fill={voteColors[category]} />}
                </Link>
              );
            })}
            <path className="dais" d="M270 345 Q320 318 370 345 L360 378 L280 378 Z" />
            <text className="dais-label" x="320" y="358" textAnchor="middle">PLENÁRIO</text>
          </svg>

          {hovered && (
            <div className="seat-tooltip" role="tooltip" style={{
              left: `${(hovered.x / 640) * 100}%`, top: `${(hovered.y / 410) * 100}%`,
              transform: tooltipTransform(hovered.x, hovered.y)
            }}>
              <div className="seat-tooltip-photo">
                {hovered.senator.foto_url
                  ? <><Image key={hovered.senator.id} src={hovered.senator.foto_url} alt="" fill sizes="48px" onLoad={() => setLoadedPhoto(hovered.senator.id)} className={loadedPhoto === hovered.senator.id ? "is-loaded" : "is-loading"} />{loadedPhoto !== hovered.senator.id && <span className="photo-skeleton" aria-hidden="true" />}</>
                  : <span aria-hidden="true">{hovered.senator.nome_parlamentar.slice(0, 1)}</span>}
              </div>
              <div>
                <strong>{hovered.senator.nome_parlamentar}</strong>
                <span>{hovered.senator.partido_sigla} · {hovered.senator.uf}</span>
                {hovered.category && <small><i style={{ background: voteColors[hovered.category] }} /> Votou {voteLabels[hovered.category]}</small>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="legend-panel">
        <div><strong>Cores das cadeiras</strong><div className="legend" aria-label={`Legenda por ${colorMode}`}>
          {baseLegend.map(item => <span key={item.key}><i style={{ background: item.color }} />{item.label} <b>{item.count}</b></span>)}
        </div></div>
        {voting && <div><strong>Pontos de voto</strong><div className="legend vote-legend" aria-label="Legenda dos votos">
          {Object.entries(voteColors).map(([label, color]) => <span key={label}><i style={{ background: color }} />{voteLabels[label as VoteCategory]}</span>)}
        </div></div>}
      </div>

      {voting && (
        <section className="vote-breakdown" aria-labelledby="breakdown-title">
          <div className="breakdown-heading"><div><span>Análise da votação</span><h3 id="breakdown-title">Como cada {colorMode === "espectro" ? "campo" : "partido"} votou</h3></div><small>Percentuais sobre os parlamentares exibidos</small></div>
          <div className="breakdown-list">{breakdowns.map(group => (
            <article key={group.key} className="breakdown-row">
              <div className="breakdown-group"><i style={{ background: group.color }} /><strong>{group.label}</strong><span>{group.total} votos</span></div>
              <div className="breakdown-bar" role="img" aria-label={`${group.label}: ${group.categories.map(item => `${voteLabels[item.category]} ${item.percentage}%`).join(", ")}`}>
                {group.categories.map(item => <i key={item.category} style={{ width: `${item.percentage}%`, background: voteColors[item.category] }} />)}
              </div>
              <div className="breakdown-values">{group.categories.map(item => <span key={item.category}><i style={{ background: voteColors[item.category] }} />{voteLabels[item.category]} <strong>{item.percentage}%</strong></span>)}</div>
            </article>
          ))}</div>
        </section>
      )}

      <details className="accessible-list"><summary>Ver lista dos senadores ({visible.length})</summary><ul>{visible.map(senator => <li key={senator.id}><Link href={`/senadores/${senator.id}`}>{senator.nome_parlamentar} — {senator.partido_sigla}/{senator.uf}</Link></li>)}</ul></details>
    </section>
  );
}
