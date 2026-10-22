# 🌾 AgroTrust

**Digitizing Agricultural Input Delivery in Ethiopia**

AgroTrust is a digital platform that gives smallholder farmers **verified, direct access** to agricultural inputs such as fertilizer. Farmers are verified **in person by a government local admin**, sign in with their own secure account, and every step from supplier to farmer is tracked.

---

## 🧩 Problem Statement

In Ethiopia, brokers exploit the agricultural input supply system by stockpiling or reselling inputs like fertilizers at inflated prices. The lack of a digital distribution system results in:

- Unfair access for smallholder farmers
- Inflated input costs
- Loss of trust and transparency

## 💡 Solution

AgroTrust enables **verified, direct access** to agricultural inputs. It provides:

- ✅ Government-verified farmer accounts (in-person verification, secure PIN login)
- ✅ Per-farmer entitlements, so nobody can take more than their share
- ✅ Payment straight to the supplier, with no cash handled by officials
- ✅ End-to-end traceability from supply lot to farmer handover
- ✅ Transparent, tamper-evident audit logging
- ✅ SMS updates to every farmer at every key step
- ✅ Admin dashboards for analytics, shortages and fraud monitoring

---

## 🔄 How It Works

1. **Verify:** the farmer is in the government registry and verified **in person by the local admin**, who gives them an activation code to create their account.
2. **Request:** the farmer requests the inputs they need, in the app or through the local admin (confirmed by an SMS code).
3. **Approve:** the local admin checks the request against the farmer's information and entitlement.
4. **Requisition:** the local admin sends the approved requests to the **assigned distributor** (government or private).
5. **Distributor check:** the distributor verifies the information and accepts, adjusts or declines.
6. **Pay:** the farmer pays by mobile money or bank directly to the supplier account.
7. **Dispatch:** the distributor sends the paid inputs to the local center.
8. **Receive:** the local admin confirms what arrived and the farmer is told where and when to collect.
9. **Hand over:** the farmer collects the inputs using a one-time code.

📱 **The farmer receives an SMS at every key step**: approved, accepted (with amount to pay), payment confirmed, on the way (with expected arrival), arrived (where, when and the pickup code), and collected.

---

## 🎯 Expected Outcomes

### 👨‍🌾 For Farmers
- Transparent pricing and access
- Direct purchase without brokers
- A trustworthy government system, with updates in Amharic, Afaan Oromo or English

### 🏛️ For Government
- End-to-end traceability of inputs
- Elimination of black-market interference
- Real-time insight into shortages and distribution

---

## 🔐 Authentication and Security

- **Farmers:** phone number + 6-digit PIN, SMS code on a new device.
- **Staff:** password + mandatory authenticator-app code (TOTP).
- **JWT access tokens** (10-15 minutes) with **rotating refresh tokens**, revocable sessions, and step-up re-authentication for sensitive actions.
- Staff accounts are created only by **invitation** from a higher admin, with two-person approval for admin roles.
- Role- and scope-based access control, enforced in guards and in the data layer.
- Hash-chained audit log, strict rate limiting, and data minimization (distributors never see phone numbers).



## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| Frontend | React PWA (English, Amharic, Afaan Oromo) |
| Backend | NestJS (modular monolith) |
| Database | MongoDB (replica set, transactions) |
| Authentication | JWT (EdDSA) + refresh rotation, Argon2id, TOTP |
| Notifications | SMS gateway (Ethio Telecom or licensed aggregator) |
| Payments | Mobile money / bank gateway |
| Ops | Docker, CI/CD, Prometheus, in-country hosting |
<<<<<<< HEAD

---



  Name : Mulualem Mekonin
  Id :CTC-3181-26


