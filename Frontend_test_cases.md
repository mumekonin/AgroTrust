# AgroTrust frontend test cases

Open the app at `http://localhost:5173`. The API must already be running. Use English unless a step says to change the language. The language control is the **EN** button. Click it, then click **English**, **አማርኛ**, or **Afaan Oromo**.

Before any **Save** on a staff page, click **Confirm** once. Type that account’s password and the 6-digit code from its authenticator app, then click **Confirm**. The note **Confirmed. You can save changes for the next 30 minutes.** means you can keep saving. When that window ends, click **Confirm** again. The authenticator code changes about every 30 seconds, so it is never written in this file.

Copy every id from the green note on the page at the moment it appears. Invitation tokens, SMS codes, and the farmer activation code are shown once.

## Data already saved

These rows are already in the database. Do not create them again. A second save with the same code fails.

| What | Code | Id | Use this |
| --- | --- | --- | --- |
| Region | OR | `6adc998537dc28c85d861354` | Yes. East Shewa hangs off this region. |
| Region | ORR | `6adc995b37dc28c85d86134f` | Leave it. It is a second Oromia and has no zone under it. |
| Zone | ES | `6adc99d637dc28c85d861355` | Yes. Parent is OR. |
| Woreda | AD | `6adc9ce4b3a6550fbca5322a` | Yes. Parent is ES. |
| Kebele | DK | `6adc9d2ab3a6550fbca5322b` | Yes. Parent is AD. |
| Local center | AD-DK | `6adc9f41b3a6550fbca5322c` | Yes. Denkaka center. |

| Account | Sign-in | Password | Where it lands |
| --- | --- | --- | --- |
| National admin | `national@gmail.com` | The password you already use for this account | `/admin` |
| Regional admin | `regional.adaa@gmail.com` | `Harbor-Adaa-2026` | `/regional` |
| Local admin | `0911000002` | `Center-Adaa-26` | `/local` |

The local admin account is created and still needs the authenticator step in case 2. The regional admin is already active and is scoped to region **OR**.

On every invitation and password in this file, the password must be at least 12 characters for a local admin and 14 for a regional admin, distributor, or auditor. It must not contain the part of the email before `@` or the digits of the phone.

## 1. Welcome page

1. Open `http://localhost:5173`.
2. Click **EN**, then **አማርኛ**. The headline changes to Amharic.
3. Click **EN**, then **Afaan Oromo**. The headline changes to Afaan Oromo.
4. Click **EN**, then **English**.
5. Click the card **Regional / National Admin**. You land on **Staff sign in**.

## 2. Finish the local admin sign-in

1. Page: `http://localhost:5173/auth/staff`.
2. **Email or phone:** `0911000002`
3. **Password:** `Center-Adaa-26`
4. Click **Sign in**.
5. If the page asks you to set up an authenticator, scan the code with your authenticator app, type the 6-digit code in **Authenticator code**, and click **Verify**. Copy any recovery codes the page shows. They are shown once.
6. You land on `/local`. The sidebar starts with **Farmers**.

If sign-in says the password is wrong, use the password you typed on **Create account** for this phone.

## 3. National admin sign-in

1. Click **Switch portal** at the bottom of the sidebar. You return to the welcome page.
2. Click **Regional / National Admin**.
3. **Email or phone:** `national@gmail.com`
4. **Password:** the password you already use.
5. Click **Sign in**.
6. **Authenticator code:** the current 6-digit code for this account.
7. Click **Verify**.
8. You land on `/admin`, title **National overview**. Empty charts are correct. There is no season yet.

## 4. Confirm the places

1. Sidebar **Places**. Page `/admin/places`.
2. The list shows region **OR** and region **ORR**.
3. In **Parent** above the list, paste `6adc998537dc28c85d861354` and leave the field. The zone **ES · East Shewa** appears.
4. Replace **Parent** with `6adc99d637dc28c85d861355`. The woreda **AD · Ada'a** appears.
5. Replace **Parent** with `6adc9ce4b3a6550fbca5322a`. The kebele **DK · Denkaka** appears.
6. Clear **Parent**. The two regions show again.

Do not click **Save** here. These four places already exist.

## 5. Confirm the center

1. Sidebar **Local centers**. Page `/admin/centers`.
2. The table shows **Denkaka center** and the id `6adc9f41b3a6550fbca5322c` under the name.

Do not click **Save** here.

## 6. Create the season

1. Sidebar **Seasons**. Page `/admin/seasons`.
2. Click **Confirm**. Password: your national password. Authenticator code: the current 6 digits. Click **Confirm**.
3. In the card **Create season**, type:

| Field | Value |
| --- | --- |
| Code | `MEHER-2026` |
| Seasons | `Meher 2026` |
| From | `2026-10-01T00:00` |
| To | `2027-06-30T23:59` |
| Requests open | `2026-10-01T00:00` |
| Requests close | `2026-12-31T11:59` |
| Requisition cutoff | `2027-01-15T17:00` |
| Payment window | `14` |
| Pickup window | `14` |
| Priority | `FCFS` |
| Status | `open` |

4. Click **Save** on **Create season**.
5. The season dropdown at the top now includes **Meher 2026**. Leave it selected. Copy is not required. Later pages load it by name.

## 7. Create the input and the price

Still on **Seasons**, with **Meher 2026** selected.

1. In **Create input**, type:

| Field | Value |
| --- | --- |
| Code | `NPS` |
| English name | `NPS fertilizer` |
| Amharic name | `ኤንፒኤስ` |
| Afaan Oromo name | `NPS` |
| Type | `fertilizer` |
| Pack size (kg) | `50` |

2. Click **Save** on **Create input**. The note says **Saved.**
3. In **Set price**, type:

| Field | Value |
| --- | --- |
| Create input | `NPS` |
| Region | `6adc998537dc28c85d861354` |
| Birr per kg | `45` |
| Subsidy | `20` |
| From | `2026-10-01T00:00` |
| To | leave empty |
| Reason | `Meher 2026 NPS price` |

4. Click **Save** on **Set price**. The note shows **Saved.** and a price id. Copy that price id.
5. Refresh the page. **Season prices** shows **NPS** with **Waiting for a second national admin**. **Approve price** lists that same row. The person who clicked **Save** on **Set price** cannot approve it. A second national admin must sign in, choose **NPS** under **Approve price**, and click **Save**.

The birr boxes are birr. The system stores santim. `45` birr is `4500` santim per kg. The farmer pays the supplier `25` birr per kg after the `20` birr subsidy.

## 8. Create the distributor and assign the center

1. Sidebar **Distributors**. Page `/admin/distributors`.
2. Click **Confirm** if the 30-minute window has closed.
3. In **Create distributor**, type:

| Field | Value |
| --- | --- |
| Code | `OCS` |
| Distributors | `Oromia Cooperative Supply` |
| Type | `government` |
| Licence | `LIC-AD-2026` |
| Phone | `0911000010` |
| Email | `supply.adaa@gmail.com` |
| Regions served | `6adc998537dc28c85d861354` |

4. Click **Save**. Copy the distributor id from the note. Call it the OCS id. The phone does not appear in the table.
5. In **Create assignment**, type:

| Field | Value |
| --- | --- |
| Seasons | `Meher 2026` |
| Local centers | `AD-DK · Denkaka center` |
| Type | `fertilizer` |
| Distributors | the OCS id |
| Priority | `1` |

6. Click **Save**. The assignment list shows the new row and its id.

## 9. Register the farmer

1. Sidebar **Farmer registry**. Page `/admin/farmers`.
2. Click **Confirm** if needed.
3. In **Register a farmer**, type and choose:

| Field | Value |
| --- | --- |
| Full name | `Bekele Desta` |
| Registry number | `AT-DK-001` |
| Phone | `0911000003` |
| Land (ha) | `1.5` |
| Crop | `teff` |
| Region | `OR · Oromia` |
| Zone | `ES · East Shewa` |
| Woreda | `AD · Ada'a` |
| Kebele | `DK · Denkaka` |
| Local centers | `AD-DK · Denkaka center` |

4. Click **Save**. The note shows **Saved. 1**.
5. The table shows **Bekele Desta**. Copy the value in the **Id** column. You need it for the allocation adjustment in case 11. The phone is not in the table.

## 10. Allocation rule

1. Sidebar **Allocation rules**. Page `/admin/allocations`.
2. Season dropdown: **Meher 2026**.
3. Click **Confirm** if needed.
4. In **Create rule**, type:

| Field | Value |
| --- | --- |
| Create input | `NPS` |
| Region | `6adc998537dc28c85d861354` |
| Kg per hectare | `100` |
| Minimum kg | `50` |
| Maximum hectares | `2` |
| Maximum kg per farmer | `200` |
| Crop filter | `teff` |
| From | `2026-10-01T00:00` |

5. Click **Save**. Copy the rule id from the note.
6. In **Approve rule**, paste that rule id. Click **Save**.
7. In **Generate quotas**, paste the same rule id. Click **Save**.

Bekele Desta holds 1.5 hectares, so the generated entitlement is 150 kg. The maximum on the rule is 200 kg.

## 11. Adjust that farmer, then look at overview

1. Still on **Allocation rules**. In **Adjust a quota**, type:

| Field | Value |
| --- | --- |
| Farmer id | Bekele Desta’s id from case 9 |
| Create input | `NPS` |
| Entitled kg | `120` |
| Reason | `Reduced for this season` |

2. Click **Save**.
3. Sidebar **Overview**. Page `/admin`. You see the season and the center. Zero requests is correct at this point.

## 12. Local admin verifies the farmer

1. Click **Switch portal**.
2. Click **Local Admin**.
3. **Email or phone:** `0911000002`
4. **Password:** `Center-Adaa-26`
5. Click **Sign in**, then **Verify** with the local admin authenticator code.
6. Page `/local`, sidebar **Farmers**.
7. Click the filter **Pending verification**.
8. On the row **Bekele Desta**, click **Verify in person**.
9. The status becomes **Verified**.
10. Click **Issue activation code**.
11. Copy the 8-character code from the note **Copy this now. It will not be shown again.** Call it the activation code. It is not sent in a way you can read on this site.

## 13. Farmer activates and signs in

1. Open `http://localhost:5173/auth/activate`.
2. Type:

| Field | Value |
| --- | --- |
| Phone number | `0911000003` |
| Activation code | the 8-character code from case 12 |
| PIN | `482916` |
| Confirm PIN | `482916` |

3. Click **Activate account**. You land on `/farmer`.
4. If you are sent back to sign-in, open `http://localhost:5173/auth/farmer`.
5. **Phone number:** `0911000003`
6. **PIN:** `482916`
7. Click **Sign in**.

## 14. Farmer requests 100 kg

1. On `/farmer`, the entitlement card shows **150** kg entitled for NPS and **150** kg remaining.
2. Click **Request inputs**. Page `/farmer/request`.
3. Season: **Meher 2026**.
4. On **NPS fertilizer**, **Quantity (kg):** `100`
5. Click **Submit request**.
6. You return to `/farmer`. The request is in the list. The pickup code is not on this page. The page says it was sent by SMS.

100 kg is inside the 150 kg remaining. A request of 200 kg must be refused by the page before it is sent.

## 15. Local admin approves the request

1. Sign in again as the local admin (`0911000002` / `Center-Adaa-26`) if the session ended.
2. Sidebar **Review queue**. Page `/local/queue`.
3. Click the filter **SUBMITTED**.
4. The row shows the request number, status **SUBMITTED**, **100** kg, and the birr the farmer pays the supplier.
5. Copy the request number. You need it at pickup.
6. Click **Approve**.
7. Click the filter **APPROVED**. The same request is there.

To try a rejection, you would type a reason in **Reason** and click **Reject**. Do not reject this request. The rest of the test follows the approved one.

## 16. Assisted request for the same farmer

Do this only if you want the second path. It needs a 6-digit code from the farmer’s SMS. The website does not show that code.

1. Sidebar **Assisted request**. Page `/local/assisted`.
2. Type:

| Field | Value |
| --- | --- |
| Farmer | `Bekele Desta` |
| Seasons | `Meher 2026` |
| Input | `NPS` |
| Quantity (kg) | `50` |

3. Click **Save**. A second form appears, **Farmer SMS code**.
4. Type the 6-digit code from the farmer’s phone. Click **Check code**.

If the mock SMS gateway does not deliver a readable message, stop this case. Case 15 is enough to continue.

## 17. Local admin sends the requisition

1. Sidebar **Requisitions**. Page `/local/requisitions`.
2. Click **Confirm**. Password `Center-Adaa-26`. Authenticator code from the local admin app. Click **Confirm**.
3. Type:

| Field | Value |
| --- | --- |
| Seasons | `Meher 2026` |
| Local centers | `AD-DK · Denkaka center` |
| Type | `fertilizer` |
| Preview only | ticked |

4. Click **Save**. The card lists the request count and the kilograms. Nothing is sent yet.
5. Untick **Preview only**. Click **Save**. Copy the requisition id and the requisition number from the note.
6. Click **Send requisition**. The status on the note becomes **SUBMITTED**.

## 18. Invite the distributor staff

1. Click **Sign out**.
2. Click **Regional / National Admin**.
3. Sign in as `regional.adaa@gmail.com` / `Harbor-Adaa-2026`, then **Verify**.
4. You are on `/regional`, title **Invitations**.
5. Click **Confirm**. Password `Harbor-Adaa-2026`. Authenticator code for the regional admin. Click **Confirm**.
6. Type:

| Field | Value |
| --- | --- |
| Role | `distributor_staff` |
| Email | `supply.staff@gmail.com` |
| Phone | `0911000004` |
| Region | `OR · Oromia` |
| Distributor | `OCS · Oromia Cooperative Supply` |

The region list shows **OR · Oromia**. That is `6adc998537dc28c85d861354`. Leave **ORR · Oromia** unselected.

7. Click **Save**.
8. Copy the invitation token and the SMS code from the two notes. They are shown once.

## 19. Distributor accepts the invitation

1. Open `http://localhost:5173/auth/accept`.
2. Type:

| Field | Value |
| --- | --- |
| Invitation token | the token from case 18 |
| SMS code | the code from case 18 |
| New password | `Kebele-Dispatch-26` |

3. Click **Create account**.
4. Click **Staff sign in**.
5. **Email or phone:** `supply.staff@gmail.com`
6. **Password:** `Kebele-Dispatch-26`
7. Click **Sign in**.
8. Set up the authenticator when the page asks, type the 6-digit code, and click **Verify**.
9. You land on `/distributor`.

## 20. Distributor accepts the kilograms

1. Page `/distributor`, sidebar **Requisitions**.
2. Click the button for the requisition number from case 17. Status is **SUBMITTED**.
3. The farmer line shows **Bekele Desta**, registry **AT-DK-001**, and the request number. The phone is not on the page.
4. Click **Confirm**. Password `Kebele-Dispatch-26`. Authenticator code for this account. Click **Confirm**.
5. **Accepted kg:** `100`
6. **Reason:** leave empty when you accept the full amount.
7. Click **Send response**.
8. The requisition status moves off **SUBMITTED**.

## 21. Local admin records the bank slip

The farmer pays the supplier, then brings the slip to the kebele. The local admin never takes the cash.

1. Sign in as the local admin again.
2. Sidebar **Bank slip**. Page `/local/payments`.
3. Click **Confirm** with password `Center-Adaa-26` and the local authenticator code.
4. On the accepted request, **Slip number:** `SLIP-AD-1001`
5. Click **Save**.
6. The row leaves the list. The slip number is not shown again on this page or on the national payments page.

## 22. Distributor creates the lot and the shipment

1. Sign in as `supply.staff@gmail.com` / `Kebele-Dispatch-26`.
2. Sidebar **Shipments**. Page `/distributor/shipments`.
3. In **Create lot**, type:

| Field | Value |
| --- | --- |
| Seasons | `Meher 2026` |
| Input | `NPS` |
| Lot number | `LOT-NPS-001` |
| Quantity (kg) | `500` |
| Source | `MoA warehouse Adama` |

4. Click **Save** on **Create lot**. Copy the lot id from the note. It stays on the page.
5. In **Create shipment**, type:

| Field | Value |
| --- | --- |
| Requisitions | the requisition id from case 17 |
| Arrival time | tomorrow at `10:00` |
| Vehicle plate | `AA-3-12345` |
| Driver name | `Abebe Tola` |
| Driver phone | `0911223344` |
| Input | `NPS` |
| Create lot | the lot id |
| Quantity (kg) | `100` |

6. Click **Save** on **Create shipment**. Copy the shipment id from the note. The driver phone is not shown again.
7. In **Update arrival time**, the shipment id is already filled. Set **Arrival time** to tomorrow at `14:00`. Click **Save**.

## 23. Local admin receives the shipment

1. Sign in as the local admin.
2. Sidebar **Receiving**. Page `/local/receiving`.
3. Click **Confirm** with the local password and authenticator code.
4. **Create shipment:** choose the shipment number.
5. The kilograms box shows `100`. Leave it at `100` if the full amount arrived.
6. **Reason:** `All 100 kg counted`
7. Click **Save**.

## 24. Center stock

1. Sidebar **Center stock**. Page `/local/stock`.
2. The NPS row shows on hand **100**, reserved **100** while the farmer has not collected, and available **0** until handover. After handover the reserved amount falls.

## 25. Pickup

The 8-character pickup code is only in the farmer’s SMS. No page shows it.

1. Sidebar **Pickup**. Page `/local/pickup`.
2. Click **Confirm** with the local password and authenticator code.
3. Type:

| Field | Value |
| --- | --- |
| Review queue | the request number copied in case 15 |
| Farmer SMS code | the 8-character code from the farmer’s SMS |

4. Click **Check code**.
5. The page shows **Bekele Desta**, the request number, and **100** kg. It does not show the code.
6. Click **Hand over**.

If the mock SMS gateway never shows the message, you cannot finish this click from the website. That is the designed behavior. Do not look for the code in the farmer home, the queue, or the audit page.

## 26. Read-only pages after the flow

Sign in as `national@gmail.com` and open each sidebar item. These pages have no new data to type.

| Sidebar | Page | What you should see |
| --- | --- | --- |
| Overview | `/admin` | The season, the center, and the request that was handed over |
| Payments | `/admin/payments` | The payment for Bekele Desta’s request, the birr amount, and the status. The slip number `SLIP-AD-1001` is absent |
| Notifications | `/admin/notifications` | Message rows. Phone numbers are absent |
| Fraud flags | `/admin/fraud` | Open flags, if any. Detail text is absent |
| Audit log | `/admin/audit` | Rows for the saves above. Hashes are absent |
| Operations | `/admin/operations` | Lookup only, in the next case |

Distributor **Payments** at `/distributor/payments` shows the same paid request without the slip number and without the farmer id.

Local **Tell in person** at `/local/notices` lists SMS that failed. The body is what the local admin reads aloud. The phone is absent. An empty list is correct when every message was accepted by the gateway.

## 27. Operations lookup

1. Sidebar **Operations**. Page `/admin/operations`.
2. Click **Confirm** if you will use a write button.
3. In **Look up requisition**, paste the requisition id from case 17. Click **Save**. The note shows the requisition number, the status, the request count, and the kilograms.
4. Leave **Resolve shipment discrepancy** and **Approve pickup override** unused unless a real discrepancy id or override id is already on the screen. Those ids are created by the system when a count or a pickup needs a regional decision. Inventing an id returns an error.

## 28. Regional office pages

1. Sign in as `regional.adaa@gmail.com` / `Harbor-Adaa-2026`.
2. `/regional` is still **Invitations**.
3. Open each item and confirm the page loads for region OR:

| Sidebar | Page |
| --- | --- |
| Overview | `/regional/overview` |
| Local centers | `/regional/centers` |
| Distributors | `/regional/distributors` |
| Allocation rules | `/regional/allocations` |
| Operations | `/regional/operations` |
| Fraud flags | `/regional/fraud` |
| Audit log | `/regional/audit` |

Denkaka center and Oromia Cooperative Supply appear. A season create form is not on this menu.

## 29. Auditor, read only

1. Sign in as the national admin.
2. Sidebar **Invitations**. Page `/admin/invitations`.
3. Click **Confirm**.
4. In **Send invitation**, type:

| Field | Value |
| --- | --- |
| Role | `auditor` |
| Email | `auditor.adaa@gmail.com` |
| Phone | `0911000005` |
| Regions served | leave empty |
| Local centers | leave empty |
| Distributors | leave empty |

5. Click **Save**. Copy the token and the SMS code.
6. Open `/auth/accept`. Token and SMS code from this step. **New password:** `Harbor-Audit-2026`. Click **Create account**.
7. Sign in at `/auth/staff` with `auditor.adaa@gmail.com` / `Harbor-Audit-2026`. Complete **Verify**.
8. You land on `/admin`. The sidebar shows **Overview**, **Payments**, **Notifications**, **Fraud flags**, and **Audit log**.
9. Open **Fraud flags**. The **Reviewing** and **Resolved** buttons are absent.

A new national admin is a different invitation. Role `national_admin` stays waiting until a second national admin opens **Invitations**, pastes the invitation id into **Approve invitation**, and clicks **Save**. One national admin cannot finish that case alone.

## 30. Language on a signed-in page

1. Signed in as any staff role, click **EN** in the top bar.
2. Click **አማርኛ**. The sidebar labels change to Amharic.
3. Click **EN**, then **English**.

## What a failed step looks like

The red line under the form is the error to read. The usual causes:

| What you see | What to do |
| --- | --- |
| Confirm it is you | Click **Confirm**, then **Save** again |
| You cannot invite that role | On the national **Invitations** page the role is regional admin, national admin, or auditor. Local admin and distributor staff are invited from `/regional` |
| Duplicate code | That place, center, season, or distributor already exists. Use the id in the table at the top |
| Wrong region | Use **OR · Oromia**, id `6adc998537dc28c85d861354` |
| Password rejected | Make it long enough and keep the email name and the phone digits out of it |
| Empty pickup or assisted code | Those codes are in the SMS. They are not on the page |
