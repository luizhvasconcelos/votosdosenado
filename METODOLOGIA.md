# Metodologia

## Camadas

1. **Fato:** voto, presença, autoria, partido e mandato, importados das fontes oficiais.
2. **Métrica:** resultados calculados por fórmula pública e exibidos com o tamanho da amostra.
3. **Editorial:** pautas prioritárias e voto esperado, sempre acompanhados de justificativa, fonte e histórico de alteração.

## Categorias canônicas

`SIM`, `NAO`, `ABST`, `OBSTRUCAO`, `AUSENTE`, `LICENCA`, `PRESIDENTE` e `SECRETO`.

A sigla recebida da API nunca é descartada. `AP`, `MIS`, `LS`, `LAP` e `LP` são tratados como licença ou missão justificada. `P-NRV` é ausência. Em votação secreta, `Votou` vira `SECRETO`: indica participação, não o conteúdo do voto.

## Alinhamento

O voto de referência é a maioria entre `SIM` e `NAO` do partido, bloco ou campo. O senador avaliado é excluído dessa maioria. Empates são descartados.

```text
alinhamento = votos iguais à referência / votações em que o senador votou SIM ou NAO
```

## Presença

```text
presença = votações em que há voto diferente de AUSENTE / votações nominais
```

## Fidelidade editorial

```text
fidelidade = votos iguais ao voto esperado / pautas prioritárias votadas no mandato
```

Ausência conta como não cumprida, exceto licença justificada. A camada editorial só deve ser ativada depois que cada pauta tiver justificativa e fonte verificável.

## Amostra

Todo índice mostra o `n`. Com menos de 10 observações, a interface exibe “dados insuficientes”.

## Espectro

A classificação inicial é partidária. Depois de histórico suficiente, a classificação comportamental poderá ser calculada e exibida ao lado da partidária, sem substituí-la silenciosamente.
