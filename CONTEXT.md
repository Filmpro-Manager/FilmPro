# FilmPro — Contexto da Aplicação

## O que é
ERP/CRM SaaS vertical para **empresas instaladoras de películas automotivas e arquitetônicas** (insulfilm, PPF, adesivo residencial/comercial).
Sistema multi-tenant: Company → Stores → Users/Dados.

## Stack
- **Backend**: Node.js + Express + TypeScript + Prisma ORM + PostgreSQL
- **Frontend**: Next.js (App Router) + React + TypeScript + Tailwind CSS
- **Estado**: Zustand (com persist para auth)
- **Formulários**: React Hook Form + Zod
- **PDF**: jsPDF / html2pdf.js
- **Pagamentos**: OpenPix (PIX, webhook com HMAC)
- **Auth**: JWT em cookie `filmpro-auth-token` (7 dias) + bcrypt
- **E-mail**: Nodemailer (reset de senha)

## Arquitetura Multi-Tenant
```
MasterUser (admin do SaaS)
└── Company (empresa cliente)
    ├── Subscription (assinatura SaaS via PIX)
    └── Store (filial/unidade)
        ├── Users (owner | manager | employee)
        ├── Clients + Vehicles
        ├── InventoryItems + InventoryMovements
        ├── ServiceCatalog
        ├── Quotes + QuoteItems
        ├── Appointments
        ├── ServiceOrders
        ├── Transactions
        ├── Goals
        └── ClientRatings
```
Todos os dados são escopados por `storeId`.

## Modelos Principais (Prisma)
| Modelo | Descrição |
|--------|-----------|
| `Company` | Empresa cliente do SaaS |
| `Store` | Filial; contém todos os dados operacionais; CNPJ, endereço, logo |
| `User` | roles: `owner`, `manager`, `employee` |
| `MasterUser` | Admin do SaaS (painel separado) |
| `Client` | Cliente com endereço, CPF/CNPJ, notas |
| `Vehicle` | Veículo do cliente (marca, modelo, ano, placa, cor) |
| `InventoryItem` | Película: tipo, unidade (m), qty, preço, transparência, cor, rollWidth |
| `InventoryMovement` | Entrada/saída/ajuste com rastreamento de usuário |
| `ServiceCatalog` | Serviços com tempo estimado e categoria |
| `Quote` | Orçamento numerado (`ORC-YYYY-NNN`), ciclo completo de status |
| `QuoteItem` | Item do orçamento com desconto individual |
| `ServiceOrder` | OS numerada (`OS-YYYY-NNN`), pode vir de Quote ou Appointment |
| `Appointment` | Agendamento numerado (`AGD-YYYY-NNN`), convertível em OS |
| `Transaction` | Financeiro: parcelamento, recorrência, competência vs. pagamento |
| `Goal` | Meta por loja ou funcionário (receita, ticket médio, conversão, etc.) |
| `ClientRating` | NPS 0–10 |
| `Subscription` | Assinatura SaaS da Company |
| `PixCharge` | Cobrança PIX mensal (OpenPix) |

## Rotas da API (`/api/*`)
`/master` · `/auth` · `/users` · `/companies` · `/stores` · `/clients` · `/inventory` · `/services` · `/quotes` · `/service-orders` · `/transactions` · `/goals` · `/ratings` · `/appointments`

## Rotas do Frontend
| Rota | Módulo |
|------|--------|
| `/dashboard` | KPIs, alertas, gráficos |
| `/clientes` | Clientes e veículos |
| `/agenda` | Calendário de agendamentos |
| `/ordens-de-servico` | Ordens de serviço |
| `/orcamentos` | Orçamentos |
| `/estoque` | Estoque de películas |
| `/servicos` | Catálogo de serviços |
| `/financeiro` | Lançamentos financeiros |
| `/fluxo-de-caixa` | Fluxo de caixa |
| `/metas` | Metas e desempenho |
| `/equipe` | Funcionários |
| `/relatorios` | Relatórios gerenciais |
| `/notas-fiscais` | Notas fiscais |
| `/configuracoes` | Configurações da loja |
| `/assinatura` | Assinatura SaaS |
| `/admin` | Painel master do SaaS |

## Convenções do Projeto
- Numeração automática de documentos: `ORC-YYYY-NNN`, `OS-YYYY-NNN`, `AGD-YYYY-NNN`
- Estoque medido em metros lineares com atributo `rollWidth` (largura da bobina)
- Tipos de película: `automotive | architecture | security | decorative | solar`
- Ciclo de vida do cliente: `active | at_risk | inactive | new`
- Assinatura cobrada mensalmente por loja ativa via PIX (OpenPix + webhook HMAC)
