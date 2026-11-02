# Site do Centro de Convivência do Idoso (CCI) – Campos do Jordão

Site informativo, **voluntário e gratuito**, do CCI "Wilma Jundi Dubieux". Projeto independente: sem ligação com nenhuma empresa, sem marca, sem propaganda.

**Situação:** protótipo. Nada foi publicado na internet. Os dados marcados como EXEMPLO não são reais, e os marcados como "a confirmar" precisam ser conferidos com a coordenação.

## O que tem aqui

| Arquivo | Para quê |
|---|---|
| `index.html` | o site (uma página só, com as seções Início, Programação, Passeios, Notícias e Como chegar) |
| `css/estilo.css` | aparência (letra grande, contraste alto) |
| `js/app.js` | lê a planilha e monta a programação, os passeios, as notícias e os avisos |
| `config.js` | telefone, endereço, links da planilha e chave do modo eleitoral |
| `dados/*.csv` | planilha de exemplo (uma aba por arquivo) |
| `docs/planilha-modelo.md` | colunas da planilha e como ligá-la ao site |
| `docs/guia-coordenadora.html` | guia de 1 página para imprimir |
| `docs/texto-secretaria.md` | pedido de autorização para a Secretaria |
| `docs/termo-autorizacao-imagem.md` | modelo de autorização de uso de imagem |
| `docs/termo-voluntariado.md` | modelo de termo de voluntariado (Lei 9.608/1998) |
| `docs/roteiro-teste-usuarios.md` | roteiro de 15 minutos para testar o site com idosos |
| `docs/creditos-imagens.md` | autores e licenças das fotos |

## Decisões, em linguagem simples

**Por que uma planilha do Google?** Porque a coordenadora já sabe usar, funciona pelo celular, guarda histórico (dá para desfazer erro) e não exige senha nova nem treinamento. Ela muda a planilha, e o site lê a planilha toda vez que alguém abre. O voluntário não precisa fazer nada.

**E se a planilha falhar?** O site guarda no celular de cada visitante a última programação que conseguiu ler. Se a planilha cair, ele mostra essa cópia e avisa a data dela. Se nunca conseguiu ler, mostra o recado "ligue para o CCI". Endereço, horário e telefone ficam escritos na própria página e aparecem sempre.

**Por que uma página só?** Rede ruim e celular simples: uma página carrega uma vez e pronto. Na primeira tela já aparecem o que é o CCI, quem pode participar e como se inscrever, além dos botões de ligar e de abrir no mapa.

**Acessibilidade (medida, não só olhada).** Testei em tela de celular (375px) e de computador (1280px), medindo todos os textos e botões:
- letra base de 20px, e nenhum texto abaixo de 18px;
- contraste mínimo de 9,3 para 1 (o nível mais alto da norma, o AAA, pede 7 para 1);
- todos os botões e links com 48px de altura ou mais;
- nada se mexe sozinho, não há texto dentro de imagem e a letra é a do próprio celular (não precisa baixar nada).

**Feito para achar rápido o que importa.**
- **"O que se faz por aqui":** cada grupo de atividades abre e mostra os dias, horários e professores, tirados da planilha. Responde a pergunta "quando tem dança?" sem ler a semana inteira.
- **Cartão "Hoje":** diz o que está acontecendo agora ou qual é a próxima atividade ("Agora: Artesanato com Mariana, até 16:00"). Quando o dia acabou, já avisa a primeira atividade de amanhã.
- **"Nos próximos dias":** mostra só os dias seguintes que têm atividade; os dias vazios viram uma linha ("Sábado e domingo: sem atividades").
- **Barra fixa no celular** com Ligar e Como chegar, sempre à mão.
- **Para a família:** botão que monta a mensagem pronta para o WhatsApp e botão que imprime a programação da semana numa folha A4 (para a geladeira).
- **A+ / A−** no topo, para aumentar a letra até 137,5% sem quebrar a página.
- Roteiro de teste com idosos em `docs/roteiro-teste-usuarios.md`.

**Visual acolhedor.** A ideia é parecer feito à mão por gente da cidade, não um modelo pronto:
- **Fotos reais de Campos do Jordão** (Abernéssia, bondinho, araucária, hortênsias) com licença livre e crédito ao autor (lista em `docs/creditos-imagens.md`). Nenhuma foto finge ser do CCI.
- **Desenhos feitos para o site**, um para cada grupo de atividades da grade real (movimento, mãos, voz, cuidado, encontros).
- **Papel creme, bilhete com fita adesiva e caderno pautado** para a lista de documentos. As fotos têm moldura branca, como foto revelada.
- **Títulos com serifa** que já vêm no aparelho (Palatino ou Georgia), sem baixar fonte.
- **Espaços reservados para as fotos do próprio CCI**, a serem tiradas sem rostos ou com autorização.

Não usei bibliotecas prontas como Bootstrap ou Tailwind: elas deixariam o site mais pesado e com cara de modelo. Toda cor passou no teste de contraste AAA antes de entrar. As fotos foram comprimidas: cerca de 380 KB de imagens no celular.

**Fotos e LGPD.** Uma foto só aparece se a coluna `autorizacao_de_imagem` estiver com "sim". Sem isso, o site esconde a foto mesmo que o link esteja na planilha. O site não tem formulário, contador de visitas nem mapa embutido do Google: não coleta dados de quem visita. O "Como chegar" usa um mapinha desenhado (fora de escala) e um botão que abre o mapa do próprio celular. O tamanho de letra escolhido no A+/A− fica guardado só naquele aparelho.

**Período eleitoral (2028).** Em `config.js`, `modoInformativo: true` esconde notícias e fotos e deixa só as informações de serviço. Essa troca deve ser feita nos 3 meses antes da eleição municipal, que será em outubro de 2028; as datas exatas saem do calendário do TSE, e quem dá a orientação é a Prefeitura.

## Onde hospedar: recomendação

**GitHub Pages**, numa conta criada para o projeto (não na conta pessoal do voluntário):
- é gratuito, sem limite de prazo e sem cartão de crédito;
- guarda o histórico de todas as mudanças;
- a conta pode ser entregue à Prefeitura depois, sem migrar nada;
- dá para trocar o endereço depois, para um domínio próprio ou para `cci.camposdojordao.sp.gov.br`.

Netlify e Firebase também servem, mas pedem mais configuração e têm limites de conta gratuita que não fazem diferença aqui.

## Ver no computador

```bash
python3 -m http.server 8080
```

Depois, abra `http://localhost:8080` no navegador. Abrir o `index.html` com dois cliques não carrega a programação, porque o navegador bloqueia a leitura de arquivos locais.

## Antes de publicar (checklist)

- [ ] Coordenadora e Secretaria aprovaram (`docs/texto-secretaria.md`)
- [ ] Telefone, horário e documentos para inscrição confirmados; os selos "a confirmar" foram retirados do `index.html`
- [ ] Posições do mapinha desenhado conferidas no local
- [ ] Planilha criada na conta do CCI/Secretaria, publicada, com os links no `config.js`
- [ ] Linhas `[EXEMPLO]` apagadas da planilha
- [ ] `prototipo: false` no `config.js` e linha `noindex` apagada do `index.html`
- [ ] Termo de voluntariado assinado (se a Prefeitura pedir)
- [ ] Coordenadora treinada com o guia impresso
