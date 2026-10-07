# SPEC: votosdosenado

> Projeto open source.
> Status: v0.2 (06/10/2026), decisões da seção 12 fechadas
> Nome: **votosdosenado** (domínio a registrar, ver seção 12)

---

## 1. Visão

Site público que mostra, de forma visual e verificável, **quem são os 81 senadores, como cada um vota e se está cumprindo a pauta pela qual foi eleito**. O cidadão escolhe quem acompanhar (seus senadores, um tema, um projeto) e recebe notificação quando algo relevante acontece.

**Princípio central:** separar **fato** de **interpretação**.

| Camada | O que é | Quem produz |
|---|---|---|
| Fato | Voto, presença, autoria, partido, mandato | Automático, dado oficial (Senado e TSE) |
| Métrica | Índices calculados (alinhamento, presença) | Automático, fórmula pública |
| Editorial | Pautas prioritárias e "voto esperado" | Curadoria, com justificativa pública |

Toda tela deixa claro em qual camada a informação está. Isso é o que dá credibilidade ao site e reduz risco jurídico.

---

## 2. Escopo

- **Todos os 81 senadores** da legislatura 2027-2031 (e suplentes em exercício).
- **Base histórica:** legislaturas 2019-2023 e 2023-2027, para que senadores reeleitos e os 27 que continuam já cheguem com histórico.
- **Votações:** plenário (nominais) no MVP; comissões na fase 3.

Fora do escopo do MVP: Câmara dos Deputados, gastos de gabinete (CEAPS), discursos.

---

## 3. Funcionalidades

### 3.1 Plenário visual (home)
- Hemiciclo com as 81 cadeiras, cor por espectro (direita, centro, esquerda) e filtro por partido, estado, bloco.
- Clique na cadeira abre o perfil.
- **Modo votação:** escolhe uma votação e o hemiciclo pinta cada cadeira com o voto (Sim, Não, Abstenção, Ausente, Obstrução). É a visualização mais compartilhável do site.

### 3.2 Perfil do senador
| Bloco | Conteúdo | Fonte |
|---|---|---|
| Identificação | Foto, nome parlamentar, partido, UF, bloco | Senado |
| Mandato | Desde quando está no Senado, mandatos anteriores, fim do mandato atual, se é titular ou suplente | Senado |
| Votos recebidos | Votos na última eleição, % válidos, posição no estado | TSE |
| Histórico mínimo | Filiações partidárias (com datas), cargos eletivos anteriores, comissões atuais | Senado e TSE |
| Índices | Alinhamento com a bancada, Fidelidade às pautas, Presença em votações-chave | Calculado |
| Votos recentes | Timeline das votações nominais com o voto dele | Senado |
| Divergências | Votos em que contrariou o gabarito | Calculado |
| Autoria | Projetos de autoria e relatorias | Senado |
| Contato | E-mail e telefone do gabinete, redes oficiais | Senado |

### 3.3 Projetos (matérias)
- Página por matéria: ementa, autor, relator, tema, tramitação, todas as votações.
- Para cada votação: placar, hemiciclo, lista nominal, orientação de cada bancada.

### 3.4 Temas
- Agrupamento de matérias por tema (ex.: segurança pública, tributação, STF e Judiciário, agro, costumes, economia).
- Página do tema: projetos em tramitação, próximas votações, ranking de senadores no tema.

### 3.5 Pautas prioritárias (gabarito C)
- Lista curta (10 a 20) de matérias com **voto esperado** e **justificativa** (promessa de campanha, posição programática).
- Cada pauta mostra quem votou conforme e quem divergiu.
- Página de metodologia explica os critérios de escolha.

### 3.6 Acompanhar e notificar
- **"Meus senadores":** usuário escolhe o estado e passa a seguir os 3 senadores dele. Não perguntamos em quem ele votou (ver LGPD, seção 9).
- Seguir também: senador avulso, tema, projeto.
- Eventos que geram notificação:
  - Senador seguido votou numa matéria nominal
  - Senador seguido divergiu do gabarito
  - Projeto seguido entrou na pauta / foi votado
  - Novo projeto no tema seguido
- Preferência de frequência: imediata ou resumo semanal.
- Toda notificação de divergência tem botão **"Cobrar"**: abre e-mail pronto ao gabinete (o usuário envia do próprio e-mail).

---

## 4. Fontes de dados

| Dado | Fonte | Observações |
|---|---|---|
| Senadores, mandatos, filiações, comissões | API Dados Abertos do Senado: `legis.senado.leg.br/dadosabertos` (`/senador`, `/comissao`) | Sem autenticação |
| Matérias e tramitação | Mesma API (`/materia`) | Campo de assunto/indexação ajuda a classificar tema |
| Votações e votos nominais | Mesma API, endpoint atual `/dadosabertos/votacao` | O endpoint legado `/plenario/lista/votacao` foi desativado em 01/02/2026. Resposta é array na raiz com `votos[]` embutido |
| Orientação de bancada | Mesma API (dados de orientação por votação) | Base do gabarito B/A |
| Votos recebidos na eleição | TSE Dados Abertos (`dadosabertos.tse.jus.br`), resultados por candidato | Carga única por eleição (2018, 2022, 2026) |
| Foto oficial | Senado | Uso permitido de imagem institucional |

### Armadilhas conhecidas (validar no início da fase 0)
- `siglaVotoParlamentar` não é enum limpo: mistura Sim/Não/Abstenção com códigos como `AP`, `P-NRV`, `MIS`, `LS`, `LAP`, `LP`, Presidente. Precisa de tabela de mapeamento para categorias canônicas.
- Em votação secreta (ex.: autoridades, sabatinas) o voto individual vem como "Votou". Não dá para saber o voto, só a presença.
- Totais (`totalVotosSim/Nao/Abstencao`) podem vir `null`: recalcular a partir dos votos.
- **A maioria das votações é simbólica** e não registra voto individual. O site deve mostrar isso explicitamente ("aprovada em votação simbólica, sem registro individual") para não criar falsa sensação de cobertura.

---

## 5. Índices (fórmulas públicas)

**Considerar só votações nominais de plenário.** Categorias canônicas: `SIM`, `NAO`, `ABST`, `OBSTRUCAO`, `AUSENTE`, `LICENCA` (licença/missão oficial justificada), `PRESIDENTE`, `SECRETO`.

### 5.1 Alinhamento com a bancada (gabarito A)
```
voto_referencia = voto majoritário (SIM/NAO) da bancada de referência na votação
alinhamento = votos iguais à referência / votações em que o senador votou SIM ou NAO
```
- Bancada de referência selecionável pelo usuário, em três níveis:
  - **Partido** do senador (maioria dos senadores do partido)
  - **Bloco** parlamentar formal do Senado
  - **Campo**: direita, centro ou esquerda (maioria dos senadores classificados naquele campo, conforme seção 6)
- **Default exibido no perfil:** campo do próprio senador. É o que conversa com a missão do site; os outros dois ficam a um clique.
- O senador avaliado é excluído do cálculo da maioria de referência (evita ele "puxar" o gabarito a favor de si).
- Empate na referência: votação descartada para aquele recorte.
- Os três valores são pré-calculados e gravados em `indice_snapshot` com `tipo` distinto (`alinhamento_partido`, `alinhamento_bloco`, `alinhamento_campo`), para a troca no front ser instantânea.

### 5.2 Fidelidade às pautas prioritárias (gabarito C)
```
fidelidade = votos iguais ao voto esperado / pautas prioritárias votadas no mandato
```
- Ausência em pauta prioritária conta como **não cumprida**, exceto `LICENCA`. Esse ponto é editorial e precisa estar escrito na metodologia.

### 5.3 Presença em votações-chave
```
presenca = votações em que votou (qualquer voto exceto AUSENTE) / total de votações nominais
```
Mostrar separadamente a presença nas pautas prioritárias.

### 5.4 Exibição
- Índice sempre com o **n** ao lado (ex.: "92% em 48 votações"). Índice com n < 10 aparece como "dados insuficientes".

---

## 6. Classificação de espectro (direita, centro, esquerda)

A imagem "Direita 48, Centro 18, Esquerda 15" que circula nas redes não tem metodologia publicada. O site precisa da sua própria, transparente:

| Opção | Como | Tradeoff |
|---|---|---|
| Por partido | Tabela partido → espectro | Simples, mas erra com senadores que destoam do partido (comum em PSD, MDB, União) |
| Por comportamento | Clusterização dos votos nominais (ex.: alinhamento com cada campo ou W-NOMINATE) | Objetivo e defensável, mas só funciona com histórico de votos |
| Híbrido (recomendado) | Começa por partido; depois de N votações nominais, passa a usar comportamento, mostrando os dois | Melhor dos dois, explica divergências ("filiado ao PL, vota como centro") |

O contraste "rótulo vs comportamento" é, por si só, o conteúdo mais forte do site para o objetivo de cobrança.

---

## 7. Modelo de dados (PostgreSQL)

```
senador(id, codigo_senado, nome_parlamentar, nome_civil, uf, foto_url,
        email, telefone, espectro_partido, espectro_comportamento, ativo)
mandato(id, senador_id, legislatura, inicio, fim, tipo[titular|suplente], participacao)
filiacao(id, senador_id, partido_sigla, inicio, fim)
eleicao_resultado(id, senador_id, ano, uf, votos, pct_validos, posicao, eleito)
partido(sigla, nome, espectro_default)
materia(id, codigo_senado, sigla_tipo, numero, ano, ementa, autor_senador_id,
        relator_senador_id, situacao, url)
tema(id, slug, nome)
materia_tema(materia_id, tema_id, origem[api|ia|manual])
votacao(id, codigo_senado, materia_id, data_hora, descricao, tipo[nominal|simbolica|secreta],
        resultado, total_sim, total_nao, total_abst)
voto(votacao_id, senador_id, sigla_original, categoria)
orientacao(votacao_id, bancada, orientacao)
pauta_prioritaria(id, materia_id, voto_esperado, justificativa, fonte_promessa_url, ativa)
pauta_prioritaria_historico(id, pauta_id, acao[incluir|alterar|retirar], motivo, autor, criado_em)
indice_snapshot(senador_id, data_ref, tipo, valor, n)

usuario(id, email, criado_em, consentimento_em, consentimento_versao)
seguimento(usuario_id, alvo_tipo[senador|tema|materia|uf], alvo_id, criado_em)
notificacao(id, usuario_id, evento_id, canal, enviada_em, status)
evento(id, tipo, payload_json, criado_em)
```

`indice_snapshot` permite mostrar evolução do índice no tempo sem recalcular tudo.

---

## 8. Arquitetura e stack

| Camada | Escolha | Por quê |
|---|---|---|
| Ingestão | Python + job agendado (diário, e de hora em hora em dia de sessão) | Mesma stack que você já domina |
| API | FastAPI | Idem |
| Banco | PostgreSQL gerenciado (Neon ou Supabase) | Custo próximo de zero no início |
| Front | **Next.js (React)** com páginas estáticas/SSR | Site público vive de SEO e de compartilhamento. SPA React puro não indexa bem os perfis e não gera preview bonito no WhatsApp. Next gera página por senador e imagem OG automática (hemiciclo da votação no preview) |
| E-mail | Resend ou SES | Barato, bom para resumo semanal |
| Push | Web Push (navegador) | Gratuito |
| Fase posterior | Bot de Telegram (grátis); WhatsApp só se houver tração (cobrança por mensagem e aprovação de template pela Meta) |
| Hospedagem | Vercel (front) + Railway ou Fly (API e jobs) | Começar barato, migrar para AWS só se escalar |

**Classificação de tema com IA:** ao ingerir uma matéria nova, um modelo lê a ementa e sugere tema(s); grava com `origem=ia` e pode ser corrigido manualmente. Volume baixo (dezenas de matérias por semana), custo irrelevante.

---

## 9. LGPD e riscos jurídicos

### 9.1 Dados dos senadores
Dado público de agente público no exercício do mandato, com base legal no interesse público e na transparência (LGPD art. 7º, §3º e §4º, e Lei de Acesso à Informação). Sem restrição relevante.

### 9.2 Dados dos usuários (ponto de atenção)
- O fato de alguém **seguir um senador ou um tema** pode revelar **opinião política**, que é **dado pessoal sensível** (LGPD art. 5º, II).
- Base legal: **consentimento específico e destacado** (art. 11, I). Na prática:
  - Checkbox próprio no cadastro, separado dos termos de uso, explicando que as escolhas de acompanhamento podem indicar preferência política.
  - Coletar só e-mail. Nada de CPF, título de eleitor, nome completo, telefone (até a fase de WhatsApp).
  - **Não perguntar em quem o usuário votou.** O "Meus senadores" é por estado, não por voto. Isso reduz a sensibilidade do dado e é suficiente para o produto.
  - Nunca vender, compartilhar ou cruzar a lista de seguidores. Nenhum ranking público de "quantos seguem X" no MVP.
  - Exclusão de conta apaga seguimentos e histórico de notificação.
  - Política de privacidade e registro do consentimento (`consentimento_versao`).

### 9.3 Honra e difamação
- O site mostra fatos e índices com fórmula pública. Evitar adjetivos ("traidor", "vendido") em qualquer texto gerado pelo site ou pela curadoria.
- Pautas prioritárias sempre com justificativa e fonte.
- Canal de correção: senador ou assessoria pode pedir correção de dado, com prazo de resposta.

### 9.4 Responsabilidade e identificação
- Marco Civil (art. 19): conteúdo de terceiros só sai com ordem judicial; mas aqui o conteúdo é próprio, então o responsável é o editor. Termos de uso devem identificar o responsável pelo site.
- Em ano eleitoral (2030 para o Senado), revisar a página editorial para não configurar propaganda (pedido de voto ou de não voto).

**Onde vale validação externa:** redação final da política de privacidade e do termo de consentimento, e a página de metodologia editorial. O restante está coberto acima.

---

## 10. Roadmap

| Fase | Entrega | Prazo-alvo |
|---|---|---|
| F0: Dados | Ingestão de senadores, mandatos, filiações, votações 2019-2026, mapeamento de `siglaVotoParlamentar`, carga TSE. Validação dos índices em notebook | out-nov/2026 |
| F1: MVP público | Hemiciclo, perfil, página de votação e de matéria, metodologia. Sem login | dez/2026 |
| F2: Pós-eleição | Carga dos eleitos de 2026 (TSE final), atualização das cadeiras em 01/02/2027 | jan-fev/2027 |
| F3: Acompanhar | **Pré-requisito: associação constituída (seção 12.2).** Cadastro por e-mail, consentimento, seguir, notificação por e-mail e web push, botão "Cobrar" | fev-mar/2027 |
| F4: Editorial | Pautas prioritárias, índice de fidelidade, temas com IA, espectro por comportamento | mar-abr/2027 |
| F5: Expansão | Votações de comissão, Telegram, comparador entre senadores, WhatsApp se houver tração | depois |

O MVP sem login vai ao ar **antes da posse** para ganhar indexação e audiência; a camada de cobrança entra junto com a nova legislatura.

---

## 11. Critérios de aceite do MVP (F1)

- [ ] 81 senadores com perfil completo (identificação, mandato, filiações, votos recebidos)
- [ ] Todas as votações nominais de plenário desde 2019 ingeridas, com votos categorizados
- [ ] Hemiciclo renderiza qualquer votação nominal em menos de 1s
- [ ] Índice de alinhamento calculado e exibido com n
- [ ] Votação simbólica aparece sinalizada como "sem registro individual"
- [ ] Página de metodologia publicada
- [ ] Preview OG por senador e por votação funcionando no WhatsApp
- [ ] Job diário roda sem intervenção e alerta em caso de falha

---

## 12. Decisões tomadas (06/10/2026)

| # | Decisão | Resultado |
|---|---|---|
| 1 | Nome | **votosdosenado** |
| 2 | Identidade do editor | Marca/associação (não pessoa física) |
| 3 | Curadoria das pautas | Inicialmente o fundador; projeto open source |
| 4 | Referência do índice de alinhamento | Partido, bloco e campo selecionáveis (default: campo) |
| 5 | Ausência em pauta prioritária | Conta como não cumprida, exceto licença justificada |

### 12.1 Nome e domínio
- Registrar `votosdosenado.com.br` (Registro.br) e `votosdosenado.org` como defesa. Em busca rápida não apareceu site com esse nome.
- **Regra de identidade visual:** o nome contém "Senado", então o site não pode parecer oficial. Proibido usar brasão, logotipo, paleta institucional ou tipografia do Senado Federal. Rodapé e página "Sobre" com o aviso fixo: *"Projeto independente, sem vínculo com o Senado Federal. Dados obtidos das APIs públicas oficiais."* Isso também atende à Resolução CGI.br que veda nomes de domínio que induzam terceiros a erro.
- Registrar a marca no INPI (classe 41 ou 38) quando o projeto ganhar tração. Termos genéricos como "votos" e "senado" tornam o registro mais fraco, então a proteção real vem do logotipo (marca mista).

### 12.2 Marca ou associação: duas coisas diferentes
Uma **marca sozinha não é pessoa jurídica**. Sem entidade, o responsável legal continua sendo você, pessoa física, e a LGPD exige identificar o controlador dos dados (arts. 9º e 41) assim que houver cadastro de usuários.

| Caminho | O que é | Prós | Contras |
|---|---|---|---|
| Marca sem entidade | Nome e identidade visual, responsável é você | Custo zero, começa já | Exposição pessoal em qualquer ação judicial; você aparece como controlador LGPD |
| Associação civil sem fins lucrativos | Pessoa jurídica com estatuto, CNPJ, diretoria | Separa seu patrimônio e nome, aceita doações, governança natural para open source e para curadoria coletiva | Mínimo de 2 associados fundadores, registro em cartório, contador (aprox. R$ 150 a 300/mês), obrigações acessórias anuais |

**Recomendação:** lançar a F1 (sem login, sem dado de usuário) como marca, e constituir a **associação antes da F3**, quando começa o cadastro. O estatuto já pode prever o conselho editorial que vai assumir a curadoria quando sair das suas mãos. A associação passa a ser a titular do domínio, da marca e do repositório.

Validação externa: estatuto da associação e cláusulas de responsabilidade dos diretores (advogado do terceiro setor ou cartório), e enquadramento contábil (imunidade/isenção de IRPJ para associação sem fins lucrativos).

### 12.3 Open source
| Componente | Licença sugerida | Por quê |
|---|---|---|
| Código | **AGPL-3.0** | Quem fizer um fork e rodar como site público é obrigado a abrir o código também. Com MIT, alguém pode pegar tudo, fechar e operar um concorrente proprietário |
| Dados derivados (índices, classificação de tema) | **CC BY 4.0** | Jornalistas e pesquisadores podem reusar citando a fonte, o que espalha a marca |
| Curadoria editorial (pautas, justificativas) | **CC BY-ND 4.0** | Pode ser reproduzida, mas não alterada mantendo o nome do votosdosenado |

Implicações práticas no repositório:
- Curadoria editorial fica no **banco**, editada por painel admin, não no código. O repositório traz só um seed de exemplo. Assim um fork não carrega o gabarito como se fosse dele.
- Segredos (chaves de e-mail, banco, push) só em variáveis de ambiente; `.env.example` no repo.
- Arquivos de governança desde o primeiro commit: `README`, `LICENSE`, `CONTRIBUTING`, `CODE_OF_CONDUCT`, `METODOLOGIA.md` (fórmulas da seção 5 e critérios da seção 6).
- Contribuições externas via **DCO** (assinatura `Signed-off-by` no commit), mais leve que CLA e suficiente para AGPL.
- Abrir o repositório na F1, junto com o site. Abrir antes atrai pouca gente e expõe código inacabado; abrir depois perde o argumento de transparência no lançamento.

### 12.4 Curadoria
- Fase inicial: fundador, com critérios escritos em `METODOLOGIA.md` e cada pauta com justificativa e fonte.
- Depois da associação: conselho editorial (3 a 5 pessoas) definido no estatuto, com voto registrado para incluir ou retirar pauta prioritária. Histórico de alterações público (tabela `pauta_prioritaria_historico`).

---

## 13. Onde executar

| Demanda | Onde |
|---|---|
| Decisões da seção 12, lista de pautas prioritárias, textos de metodologia | Chat |
| F0 a F5 (repo, ingestão, banco, front, deploy) | Claude Code |
| Pesquisa das promessas de campanha dos 81 senadores para embasar o gabarito C | Cowork (pesquisa longa multi-fonte) |
