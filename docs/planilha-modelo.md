# Planilha do site do CCI

O site lê **uma planilha do Google com 4 abas**. A coordenação mexe só na planilha; o site se atualiza sozinho (pode levar até 5 minutos para aparecer, porque o Google demora um pouco para republicar).

Os arquivos de exemplo estão na pasta [`dados/`](../dados) (um `.csv` por aba). Dá para importar cada um no Google Planilhas em *Arquivo > Importar > Fazer upload > Inserir nova(s) página(s)*.

**Regras que valem para todas as abas**

- **Não mude os nomes das colunas** (a primeira linha). Pode mudar a ordem, mas não o nome.
- Datas no formato **dia/mês/ano**: `14/11/2026`.
- Coluna **ativo**: escreva `sim` para aparecer no site e `não` para esconder sem apagar.
- Linha em branco é ignorada.
- Escrever `[EXEMPLO]` no começo do título faz aparecer o selo "EXEMPLO". Usar só no protótipo.

---

## Aba `programacao`: atividades que se repetem toda semana

| Coluna | O que escrever | Exemplo |
|---|---|---|
| dia_da_semana | segunda, terça, quarta, quinta, sexta, sábado ou domingo | `terça` |
| horario_inicio | hora de começo | `09:00` |
| horario_fim | hora de término (pode ficar vazio) | `10:00` |
| atividade | nome da atividade | `Dança` |
| responsavel | primeiro nome de quem conduz (pode ficar vazio). Aparece como "com Estela" | `Estela` |
| semana_do_mes | vazio = toda semana. `1`, `2`, `3`, `4` = só naquela semana do mês. `última` = só na última | `1` |
| local | onde, dentro do CCI (pode ficar vazio) | `Salão principal` |
| observacao | recado curto (pode ficar vazio) | `Traga seu celular` |
| ativo | sim ou não | `sim` |

Uma linha por atividade por dia. Dança na terça e na quinta = duas linhas.

Atividades que mudam conforme a semana do mês (como a tarde de sexta: 1ª sexta Bingo, 2ª Café com Poesia…) ficam numa linha cada, com o número em `semana_do_mes`. O site mostra em "Hoje" e na semana só a que vale naquela data, e lista todas em "Atividades de cada mês".

## Aba `eventos`: passeios e datas especiais

| Coluna | O que escrever | Exemplo |
|---|---|---|
| data | dia do evento | `14/11/2026` |
| horario | hora (texto livre) | `8h` |
| tipo | Passeio, Evento, Festa… | `Passeio` |
| titulo | nome curto | `Passeio ao Horto Florestal` |
| descricao | uma ou duas frases | `Saída de van do CCI.` |
| local | onde é ou de onde sai | `Em frente ao CCI` |
| como_participar | inscrição, prazo, vagas | `Inscrição no CCI até 10/11` |
| ativo | sim ou não | `sim` |

Eventos com data que já passou somem do site sozinhos.

## Aba `noticias`: notícias e fotos

| Coluna | O que escrever | Exemplo |
|---|---|---|
| data | dia da notícia | `25/10/2026` |
| titulo | título curto | `Oficina de artesanato termina com exposição` |
| texto | poucas linhas, linguagem simples | |
| link_da_foto | link da foto no Google Drive (compartilhada como "qualquer pessoa com o link") | |
| descricao_da_foto | o que aparece na foto, para quem não enxerga bem | `Mesa com peças de crochê coloridas` |
| autorizacao_de_imagem | `sim` **só se todas as pessoas que aparecem assinaram o termo** | `sim` |
| ativo | sim ou não | `sim` |

**Proteção embutida:** se `autorizacao_de_imagem` não for `sim`, o site **não mostra a foto**, mesmo que o link esteja preenchido.

Cuidados (LGPD):
- Nada de nome completo junto da foto. Primeiro nome, no máximo.
- Nada de informação de saúde (doença, remédio, deficiência, internação) de ninguém.
- Prefira fotos de mãos, trabalhos, grupos de costas ou de longe quando não houver termo assinado, e mesmo assim só publique com `sim`.

## Aba `avisos`: recados rápidos no topo do site

| Coluna | O que escrever | Exemplo |
|---|---|---|
| aviso | o recado | `Sexta (20/11) não haverá bingo por causa do feriado.` |
| importante | `sim` deixa o aviso vermelho | `não` |
| mostrar_a_partir_de | primeiro dia que aparece (vazio = já) | `01/11/2026` |
| mostrar_ate | último dia que aparece (vazio = sempre) | `20/11/2026` |
| ativo | sim ou não | `sim` |

---

## Como ligar a planilha ao site (feito uma vez só, pelo voluntário)

1. Criar a planilha **na conta Google do CCI ou da Secretaria** (não na conta pessoal do voluntário), com as 4 abas acima.
2. Compartilhar com o voluntário como **editor**, para ajudar quando precisar.
3. *Arquivo > Compartilhar > Publicar na web*. Escolher a aba `programacao` e o formato **Valores separados por vírgula (.csv)**. Clicar em Publicar e copiar o link.
4. Repetir o passo 3 para as abas `eventos`, `noticias` e `avisos`.
5. Colar os 4 links no arquivo [`config.js`](../config.js), em `planilha:`.

"Publicar na web" deixa só **o conteúdo dessas abas** visível para quem tiver o link; não dá acesso para editar. Por isso a planilha **não pode ter nenhuma aba com dados pessoais** (lista de inscritos, telefones, etc.). Lista de inscritos fica em outro arquivo, nunca neste.
