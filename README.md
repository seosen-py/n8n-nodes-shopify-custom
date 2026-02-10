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