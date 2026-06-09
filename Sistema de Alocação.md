Você é um engenheiro de software sênior e arquiteto de sistemas. Desenvolva uma aplicação completa para **gestão e alocação mensal de Recursos Humanos em projetos de Pesquisa, Desenvolvimento e Inovação (PD\&I)**.

A aplicação deve ser pensada para uso corporativo, com foco em clareza, consistência dos dados, facilidade de manutenção e boa experiência do usuário.

### **Objetivo do sistema**

O sistema deve permitir:

* cadastrar colaboradores;  
* cadastrar projetos;  
* realizar alocação mensal de colaboradores por projeto em percentual;  
* controlar automaticamente o percentual disponível de cada colaborador;  
* usar um projeto especial chamado **RTBA (Resource To Be Allocated)** para representar a disponibilidade ainda não alocada;  
* visualizar alocações por projeto e por colaborador;  
* apresentar um dashboard gerencial;  
* permitir configuração de tema visual e da forma de armazenamento dos dados;  
* ter uma camada de abstração de persistência para permitir uso com planilhas, CSV ou banco de dados.

---

## **Requisitos funcionais**

### **1\. CRUD de Recursos Humanos**

Criar um módulo de cadastro de Recursos Humanos com os seguintes campos:

* `id`  
* `nome`  
* `tipo` → valores possíveis: `RHD` ou `RHI`  
* `cargo`  
* `status` → ativo ou inativo  
* `data_criacao`  
* `data_atualizacao`

Regras:

* não permitir duplicidade exata de nome \+ tipo \+ cargo sem confirmação;  
* colaboradores inativos não devem aparecer como opção para novas alocações, mas seu histórico deve ser preservado;  
* permitir busca e filtro por nome, tipo, cargo e status.

---

### **2\. CRUD de Projetos**

Criar um módulo de cadastro de Projetos com os seguintes campos:

* `id`  
* `nome`  
* `descricao`  
* `data_inicio`  
* `data_fim`  
* `status` → ativo ou inativo  
* `data_criacao`  
* `data_atualizacao`

Regras:

* validar que `data_fim` não seja anterior à `data_inicio`;  
* permitir busca e filtro por nome, status e período;  
* ao criar o sistema, já deve existir um projeto pré-cadastrado com:  
  * `nome = RTBA`  
  * `descricao = Resource To Be Allocated`  
  * `status = ativo`  
* o projeto RTBA é especial e não pode ser excluído;  
* o nome RTBA deve ser reservado e não pode ser reutilizado para outro projeto.

---

### **3\. Alocação mensal por projeto**

Criar um módulo de **alocação por projeto**, onde o usuário:

* seleciona um projeto;  
* visualiza os colaboradores já alocados no projeto;  
* visualiza os meses do período relevante;  
* pode alterar alocações existentes;  
* pode adicionar novos colaboradores, visualizando o nome, o tipo, o cargo e o percentual disponível;  
* define percentuais de alocação mês a mês.

Cada alocação deve conter:

* `id`  
* `projeto_id`  
* `colaborador_id`  
* `ano_mes` (formato YYYY-MM)  
* `percentual_alocado`

#### **Regras críticas de negócio**

1. A alocação é **mensal** e em **percentual**.  
2. Para cada colaborador, o somatório das alocações em todos os projetos em um mesmo mês deve ser **no máximo 100%**.  
3. O projeto **RTBA** representa automaticamente o percentual disponível do colaborador em cada mês:  
   * se um colaborador não estiver alocado em nenhum projeto, então ele terá **100% em RTBA**;  
   * se estiver alocado parcialmente, o RTBA será:  
     `100% - soma das alocações reais daquele mês`;  
   * se atingir 100% de alocação real, então RTBA será 0%.  
4. O usuário **não poderá editar diretamente** as alocações do projeto RTBA.  
5. Ao selecionar o projeto RTBA:  
   * apenas exibir a disponibilidade mês a mês por colaborador;  
   * não permitir inclusão, edição ou exclusão manual de percentuais.  
6. Toda alteração nas alocações de projetos normais deve recalcular automaticamente o RTBA correspondente.  
7. Não permitir salvar alocação se o total mensal do colaborador ultrapassar 100%.  
8. Deve haver feedback claro de validação, mostrando:  
   * percentual já comprometido;  
   * percentual disponível;  
   * excedente, se houver.  
9. Permitir alocação com zero por cento.  
10. A edição de alocação deve ser transacional: ou tudo salva corretamente, ou nada salva.

---

### **4\. Janela de visualização por período**

O sistema deve permitir filtrar e visualizar as alocações por período com:

* `ano/mês inicial`  
* `ano/mês final`

Padrões:

* início padrão \= mês corrente;  
* fim padrão \= 6 meses à frente.

Regras:

* a visualização deve considerar apenas os meses do intervalo selecionado;  
* idealmente, a grade deve mostrar colunas por mês;  
* ao abrir um projeto, mostrar apenas os meses que façam sentido na interseção entre:  
  * período do filtro;  
  * período do projeto.

---

### **5\. Visualização de alocação por colaborador**

Criar uma segunda visão principal chamada **Alocação por Colaborador**.

Nela, o usuário deve:

* visualizar todos os colaboradores;  
* ao selecionar um colaborador, expandir todos os projetos em que está alocado;  
* visualizar os percentuais mês a mês;  
* visualizar também o RTBA;  
* poder editar alocações por projeto diretamente nessa visão, exceto RTBA.

Regras:

* aplicar as mesmas validações de limite de 100%;  
* recalcular o RTBA automaticamente;  
* permitir filtros por nome, tipo, cargo, status e período;  
* exibir total mensal consolidado por colaborador.

---

## **Requisitos de interface**

### **Telas principais**

A aplicação deve ter, no mínimo, as seguintes telas:

1. **Dashboard**  
2. **Recursos Humanos**  
3. **Projetos**  
4. **Alocação por Projeto**  
5. **Alocação por Colaborador**  
6. **Configurações**

### **Requisitos de UX/UI**

* interface limpa, profissional e responsiva;  
* tabela com rolagem horizontal para múltiplos meses;  
* uso de cores para indicar situação de alocação no consolidado da visão por colaborador:  
  * verde: disponibilidade saudável (100% alocado em projetos, incluindo o RTBA);  
  * amarelo: em 0% e 100%;  
  * vermelho: 100% em RTBA;  
* tooltips ou indicadores explicando regras de cálculo;  
* confirmação antes de excluir registros;  
* mensagens de sucesso e erro claras;  
* suporte a tema claro e escuro.

---

## **Dashboard gerencial**

Defina e implemente um dashboard gerencial útil para acompanhamento da capacidade e ocupação da equipe.

### **Sugestões do que apresentar**

1. **Indicadores principais (cards)**  
* total de colaboradores ativos;  
* total de projetos ativos;  
* percentual médio de ocupação da equipe no mês corrente;  
* total de capacidade disponível (RTBA) no mês corrente;  
* quantidade de colaboradores com ocupação parcial;  
* quantidade de colaboradores com 100% de ocupação;  
* quantidade de projetos sem equipe alocada.  
2. **Gráficos**  
* gráfico de barras com ocupação média por mês;  
* gráfico de barras ou pizza por tipo de colaborador (RHD/RHI);  
* gráfico de barras com top colaboradores desalocados;  
* gráfico de linha mostrando evolução da capacidade disponível (RTBA) ao longo dos meses.  
3. **Tabelas gerenciais**  
* colaboradores com maior disponibilidade;  
* matriz resumida de alocação por mês.  
4. **Filtros no dashboard**  
* período;  
* tipo de colaborador;  
* status do projeto;  
* projeto específico.

---

## **Configurações**

Criar um módulo de configurações com pelo menos:

* seleção de tema:  
  * claro  
  * escuro  
* definição do tipo de armazenamento dos dados do sistema:  
  * planilha(s)  
  * CSV  
  * banco de dados  
* definição do caminho/local de armazenamento  
* parâmetros padrão do sistema:  
  * meses exibidos por padrão  
  * projeto padrão RTBA protegido  
  * formato de exportação  
* possibilidade de exportar dados e relatórios

---

## **Camada de persistência / armazenamento**

A aplicação deve ter uma **camada de abstração de dados** desacoplada da interface e da regra de negócio.

Crie uma arquitetura baseada em repositórios ou providers, por exemplo:

* `IRHRepository`  
* `IProjetoRepository`  
* `IAlocacaoRepository`  
* `IConfigRepository`

E implemente adaptadores concretos para diferentes meios de armazenamento.

### **Opções de armazenamento**

#### **1\. Planilhas (padrão)**

Esta será a opção padrão.

Estrutura:

* `alocacoes.xlsx`  
  * aba `colaboradores`  
  * aba `projetos`  
  * aba `alocacoes`  
  * aba `configuracoes`

Colunas:

* `colaboradores`: id, nome, tipo, cargo, status, data\_criacao, data\_atualizacao  
* `projetos`: id, nome, descricao, data\_inicio, data\_fim, status, especial\_rtba, data\_criacao, data\_atualizacao  
* `alocacoes`: id, projeto\_id, colaborador\_id, ano\_mes, percentual\_alocado, data\_criacao, data\_atualizacao  
* `configuracoes`: chave, valor

#### **2\. CSV**

Estrutura:

* `colaboradores.csv`  
* `projetos.csv`  
* `alocacoes.csv`  
* `configuracoes.csv`

Observações:

* implementar leitura e escrita robusta;  
* garantir consistência de IDs;  
* considerar concorrência simples;  
* recomendado apenas para cenários menores.

#### **3\. Banco de dados**

Estrutura:

* SQLite como banco padrão local;  
* estruturar de forma compatível com futura migração para PostgreSQL e MySQL.

Tabelas:

* `colaboradores`  
* `projetos`  
* `alocacoes`  
* `configuracoes`

Regras:

* usar chave primária;  
* índices para `colaborador_id`, `projeto_id`, `ano_mes`;  
* constraints para evitar registros inválidos;  
* views opcionais para consolidações.

---

## **Regras de cálculo do RTBA**

Implemente explicitamente a lógica do projeto RTBA.

Para cada colaborador e mês:

* `total_alocado_real = soma(percentuais de todos os projetos exceto RTBA)`  
* `rtba = 100 - total_alocado_real`  
* se `rtba < 0`, bloquear salvamento e informar erro;  
* se `rtba > 100`, corrigir para 100 apenas se não houver alocações reais;  
* RTBA deve sempre existir logicamente, mesmo que não precise ser armazenado fisicamente;  
* avaliar duas abordagens e implementar a mais consistente:  
  1. **RTBA calculado dinamicamente** a partir das alocações reais;  
  2. **RTBA persistido** e sincronizado automaticamente.

Preferência: **calcular dinamicamente**, para evitar inconsistência.

---

## **Requisitos técnicos**

Peço que você escolha uma stack moderna e adequada, justificando a escolha.

### **Sugestão de stack**

Se possível, gerar uma aplicação web full stack com:

* **Frontend:** React \+ TypeScript  
* **UI:** Material UI, Ant Design ou Tailwind  
* **Backend:** Python com FastAPI ou Node.js com NestJS/Express  
* **Persistência:** camada abstrata com suporte inicial a planilha(s), CSV e SQLite  
* **Gráficos:** Recharts, Chart.js ou equivalente

Mas aceite outra stack, desde que seja robusta, organizada e fácil de evoluir.

---

## **Arquitetura esperada**

O código deve ser organizado em camadas:

* apresentação / interface  
* aplicação / serviços  
* domínio / regras de negócio  
* infraestrutura / persistência

Desejo:

* código limpo e bem estruturado;  
* separação clara de responsabilidades;  
* validações centralizadas;  
* tipagem forte;  
* documentação do projeto;  
* arquivos de exemplo para teste;  
* instruções para rodar localmente.

---

## **Funcionalidades adicionais desejáveis**

Se possível, incluir:

* importação e exportação de dados;  
* exportação da visão de alocação para Excel/CSV;  
* auditoria simples de alterações;  
* logs de erro;  
* controle básico de usuários/perfis futuramente expansível;  
* API para consulta das alocações;  
* testes unitários para regras críticas;  
* testes de integração para persistência e cálculos.

---

## **Entregáveis esperados**

Quero que você gere:

1. a arquitetura proposta;  
2. a modelagem de dados;  
3. o fluxo das regras de negócio;  
4. o código completo da aplicação;  
5. os arquivos de configuração;  
6. dados iniciais de exemplo;  
7. instruções de execução;  
8. sugestões de evolução futura.

---

## **Regras importantes**

* Não simplifique a lógica de alocação mensal.  
* O RTBA é obrigatório.  
* Nunca permitir que o total do colaborador ultrapasse 100% em nenhum mês.  
* A edição de alocação deve funcionar tanto pela visão de projeto quanto pela visão de colaborador.  
* O armazenamento deve ser desacoplado por interface/adapter.  
* O padrão de armazenamento inicial deve ser por planilha(s).  
* O sistema deve estar preparado para expansão futura.

---

## **Resultado esperado**

Gere a solução completa com:

* backend;  
* frontend;  
* estrutura de persistência;  
* exemplos de dados;  
* comentários importantes no código;  
* README com instruções claras.

Caso necessário, comece apresentando:

1. arquitetura geral;  
2. estrutura de pastas;  
3. modelagem;  
4. implementação.

Somente depois avance para o código completo.

---

