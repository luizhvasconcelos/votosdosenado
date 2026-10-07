import { LayerBadge } from "@/components/LayerBadge";

export const metadata = {
  title: "Metodologia",
  description: "Fórmulas públicas dos índices do votosdosenado.",
};

export default function MethodologyPage() {
  return <article className="container prose-page">
    <LayerBadge type="metrica" />
    <h1>Metodologia aberta</h1>
    <p className="lead">O objetivo não é dizer o que pensar. É mostrar de onde cada número veio — e permitir que qualquer pessoa o reproduza.</p>

    <h2>Três camadas, sempre separadas</h2>
    <dl className="layer-definitions">
      <div><dt><LayerBadge type="fato" /></dt><dd>Voto, presença, autoria, partido e mandato são importados automaticamente das fontes oficiais.</dd></div>
      <div><dt><LayerBadge type="metrica" /></dt><dd>Índices são calculados por fórmulas públicas. Todo percentual mostra também o tamanho da amostra.</dd></div>
      <div><dt><LayerBadge type="editorial" /></dt><dd>Pautas prioritárias e voto esperado dependem de curadoria, justificativa e fonte pública.</dd></div>
    </dl>

    <h2>Alinhamento com a bancada</h2>
    <pre>voto de referência = maioria SIM/NAO do grupo, sem o senador avaliado{"\n"}alinhamento = votos iguais à referência / votos SIM ou NAO do senador</pre>
    <p>O grupo pode ser partido, bloco ou campo político. Empates são descartados. O padrão no perfil é o campo. Licenças, ausências, abstenções, obstrução e voto do presidente não entram no denominador.</p>
    <p>No gráfico detalhado, cada marca corresponde a uma comparação reproduzível. O pop-over mostra o voto individual e a maioria do grupo; o clique abre a matéria ou, quando ela não está vinculada, a votação nominal.</p>

    <h2>Participação em votações nominais</h2>
    <pre>participação = registros diferentes de AUSENTE e LICENCA / total de registros</pre>
    <p>Ausências e licenças são exibidas separadamente. Uma licença não é tratada como presença nem confundida com falta não justificada. A métrica mede participação apenas nas votações nominais disponíveis, não presença física em todas as sessões do Senado.</p>

    <h2>Atividade legislativa</h2>
    <p>Projetos de autoria, autorias principais, relatorias, discursos, apartes e comissões são contados a partir dos conjuntos oficiais do Senado. Sempre que o mandato tem uma data inicial disponível, o perfil considera somente registros a partir dela.</p>
    <p>“Projetos de autoria” reúne proposições legislativas, como PEC, PL, PLP, PDL e PRS. “Autoria principal” distingue o primeiro autor das coautorias. “Falas no Plenário” soma discursos e apartes, mantendo os dois subtotais visíveis.</p>

    <h2>Amostra mínima</h2>
    <p>Resultados com menos de 10 votações aparecem como “dados insuficientes”. Sempre exibimos o <em>n</em>.</p>

    <h2>Espectro político</h2>
    <p>A primeira classificação vem do partido. Após histórico suficiente, uma classificação comportamental pode ser calculada e exibida lado a lado. Ela não apaga o rótulo partidário.</p>

    <h2>Classificação por temas</h2>
    <p>A associação inicial procura termos públicos e reproduzíveis na ementa oficial de cada matéria. Uma mesma matéria pode aparecer em mais de um tema. A indicação “classificação automática” permanece visível para não confundir essa associação com um assunto oficial atribuído pelo Senado ou com revisão editorial.</p>
    <p>Os gráficos temáticos somam votos individuais Sim, Não e Abstenção das votações relacionadas. Eles mostram o volume agregado de votos registrados — não representam uma posição única do Senado sobre todo o tema.</p>

    <h2>Comentários e reações</h2>
    <p>Comentários, respostas, curtidas, aprovações e desaprovações formam uma camada comunitária separada. Eles não alteram dados oficiais, métricas ou classificações. Nesta fase local, a identidade anônima do navegador limita reações repetidas, mas ainda não substitui autenticação de usuário e ferramentas completas de moderação.</p>

    <h2>Limites da cobertura</h2>
    <p>A maioria das votações do Senado é simbólica e não registra votos individuais. Essas votações são explicitamente marcadas como “sem registro individual”. Em votações secretas, mostramos apenas que o parlamentar votou, nunca inferimos o conteúdo do voto.</p>
  </article>;
}
