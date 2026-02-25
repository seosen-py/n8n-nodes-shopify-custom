<div align="center">

# 🛍️ n8n-nodes-shopify-custom

**Powerful Shopify automation for n8n — without GraphQL headaches**

[![npm](https://img.shields.io/npm/v/n8n-nodes-shopify-custom)](https://www.npmjs.com/)
[![Downloads](https://img.shields.io/npm/dm/n8n-nodes-shopify-custom)](https://www.npmjs.com/)
[![License](https://img.shields.io/npm/l/n8n-nodes-shopify-custom)](https://www.npmjs.com/)

</div>

---

## ✨ Overview

**n8n-nodes-shopify-custom** is a custom **Shopify node for n8n** designed for teams and builders who want to automate Shopify quickly — without manually writing GraphQL queries or constantly checking Shopify documentation.

Most workflows are handled directly through a clean UI:

**Select resource → Choose action → Fill fields → Run.**

---

## 🚀 Why this node instead of the default Shopify node?

This package focuses on the features advanced Shopify workflows actually need:

- ✅ Full **Metafield Values** management  
- ✅ Full **Metafield Definitions** support (create / update / delete)  
- ✅ Full **Metaobject** support  
- ✅ Advanced **Collections** handling (Smart & Manual)  
- ✅ Complete **Product Variant** operations  
- ✅ Significantly reduced need to work with GraphQL manually  

---

## 🧩 Supported Resources

The single node **`Shopify Custom`** includes resource-based actions:

| Resource | Supported |
|----------|----------|
| Product | ✔ |
| Product Variant | ✔ |
| Collection | ✔ |
| Customer | ✔ |
| Order | ✔ |
| Draft Order | ✔ |
| File | ✔ |
| Translation | ✔ |
| Metaobject | ✔ |
| Metafield Value | ✔ |
| Metafield Definition | ✔ |
| Service | ✔ |

Most resources support:

- Create  
- Get  
- Get Many  
- Update  
- Delete  

---

## 📚 Functional Breakdown

- **Products / Product Variants:**
  - **Get / Get Many:**
    - Allows you to get a list of your products
    - Allows you to get product metafields and their values together with products
  - **Create / Update:**
    - **Fields supported**
      - **For products:**
        - Default fields: `Title`, `Description`, `Vendor`, `Product type`, `Meta title`, `Meta description`, `Handle`, `Status`, `Tags`
        - Allows you to assign a template by `Template Suffix`
      - **For product variants:**
        - `Title`, `SKU`, `Barcode`, `Price`, `Compare at price`, `Taxable`
  - **Delete**

- **Collections:**
  - **Get / Get Many:**
    - Allows you to get a list of collections
    - Allows you to get metafields and their values for each collection
  - **Create / Update:**
    - **Fields supported**
      - Default fields: `Title`, `Handle`, `Description`, `Meta title`, `Meta description`
      - Conditions: `Manual` / `Smart` collection + conditions setup (including dynamic metafield loading)
      - Allows you to assign a template by `Template Suffix`
  - **Delete**

- **Customers:**
  - **Get / Get Many:**
    - Allows you to get one customer or a list of customers
    - Supports optional metafields loading with values
  - **Create / Update:**
    - **Fields supported:**
      - `Email`, `Phone`, `First name`, `Last name`
      - `Note`, `Tax exempt`, `Accepts marketing`, `Tags`
  - **Delete**

- **Orders:**
  - **Get / Get Many:**
    - Allows you to get one order or a list of orders
    - Supports optional metafields loading with values
  - **Create / Update:**
    - **Fields supported:**
      - Order fields: `Email`, `Note`, `Tags`
      - Line items: `Variant ID`, `Quantity`
  - **Delete**

- **Draft Orders:**
  - **Get / Get Many:**
    - Allows you to get one draft order or a list of draft orders
    - Supports optional metafields loading with values
  - **Create / Update:**
    - **Fields supported:**
      - Draft order fields: `Email`, `Note`, `Tags`
      - Line items: `Variant ID`, `Quantity`
  - **Delete**

- **Metafield Value:**
  - **Set:**
    - Mass set metafield values for selected owner type (`Product`, `Variant`, `Collection`, `Customer`, `Order`, `Draft Order`)
    - Dynamic metafield definition picker
    - Value input changes automatically based on metafield type
  - **Get / Get Many:**
    - Get one metafield by `Namespace + Key`
    - Get many metafields from selected owner (with optional namespace filter)
  - **Delete:**
    - Delete one or many metafield values by selected definition

- **Metafield Definition:**
  - **List / Get:**
    - Browse definitions by owner type
    - Search and inspect existing definitions
  - **Create / Update:**
    - **Fields supported:**
      - `Name`, `Namespace`, `Key`, `Type`
      - `Description`
      - Validation rules
  - **Delete:**
    - Delete a definition
    - Optional delete of all associated metafield values

- **Translation:**
  - **Get / Get Many:**
    - Read translatable content (`key`, `digest`) and existing translations
    - Supports locale and optional market filtering
  - **Register / Remove:**
    - Create or update translations with `translationsRegister`
    - Delete translations by key + locale (+ optional market IDs)
  - **Metafield workflow (important):**
    - Use the metafield ID as `resourceId` (`gid://shopify/Metafield/{id}`)
    - First run **Translation → Get** and copy `digest` from `translatableContent`
    - For metafields, use translation `key` = `value`
    - Register with the same key + digest; if original metafield value changes, fetch a new digest before next register

- **Metaobjects:**
  - **Get / Get Many:**
    - Get a single metaobject or a list by type
    - Supports pagination, search query and sorting
  - **Create / Update:**
    - **Fields supported:**
      - `Type`, `Handle`
      - Flexible key/value fields
      - Update option for handle redirect
  - **Delete**

- **Files / Media:**
  - **Get Many:**
    - Get store files and media assets
    - Filter by usage, media type, query, and sorting
  - **Update:**
    - Rename file (`filename`)
    - Update `alt` text
  - **Delete:**
    - Delete files by IDs
  - **Delete Unused Images:**
    - Find images with `used_in:none`
    - `Dry Run` mode for safe preview before deletion

---

## 🧠 Metafields without the pain

This node removes most of the manual complexity typically involved in Shopify metafield workflows:

- Dynamically loads available metafields based on context
- Allows selecting metafields directly in the UI
- Dedicated resource for **Metafield Values**
- Dedicated resource for **Metafield Definitions**
- Supports **reference metafields** and **metaobject flows**

---

## 👥 Who is this for?

- Marketing teams
- Operations & e-commerce teams
- n8n automation builders
- Anyone who is tired of manually fixing AI-generated GraphQL queries

---

## 📦 Installation (Community Nodes)

1. Open **n8n**
2. Go to **Settings → Community Nodes**
3. Click **Install**
4. Enter: n8n-nodes-shopify-custom
5. Confirm installation

The **Shopify Custom** node will appear in your node list.

---

## 🔑 Shopify Setup (Admin API Token)

To use the node, create a Shopify **Custom App**:

1. Shopify Admin → **Apps → Develop apps**
2. Create a new **Custom App**
3. Enable **Admin API access scopes**
4. Recommended scopes:
* read_products, write_products
* read_customers, write_customers
* read_orders, write_orders
* read_draft_orders, write_draft_orders
* read_metaobjects, write_metaobjects
* read_metaobject_definitions, write_metaobject_definitions
* read_translations, write_translations

Optional (historical orders):

* read_all_orders

5. Install the app
6. Copy the **Admin API access token**

---

## ⚙️ n8n Credentials Setup

Create credential **Shopify Custom Admin API**:

| Field | Value |
|------|------|
| Shop Subdomain | your-shop-name (without `.myshopify.com`) |
| Admin API Version | default is fine |
| Admin Access Token | token from Shopify |

After saving, the node is ready to use.

---

## 💡 Designed for real workflows

- One node for the full Shopify automation surface
- Clear resource-based structure
- Metafields and metaobjects handled directly in UI flows
- Perfect for **AI agents** and **tool-based workflows** (`usableAsTool: true`)

---

## 🗺️ Roadmap

- Pages support
- Blogs / Articles support
- Full trigger parity with the standard Shopify node

---

## 🧭 In short

**n8n-nodes-shopify-custom** helps you build Shopify automations in **minutes instead of hours**, without constantly writing and debugging GraphQL.

---

## 🤝 Need Custom Automation or Integration?

If this node doesn’t fully cover your use case — or you need something **tailored specifically to your workflow**, I’m open for custom work.

### I can help with:

*   Custom **n8n nodes** for your service
    
*   Complex **n8n automations**
    
*   NocoDB integrations (advanced relations, custom logic, performance tuning)
    
*   API integrations (internal or external services)
    
*   Workflow optimization & architecture consulting

Whether it’s a **small tweak** or a **full-blown custom integration**, feel free to reach out.

Email: seo.orchid.kid@gmail.com
Telegram: https://t.me/xcharlesbronsonx
