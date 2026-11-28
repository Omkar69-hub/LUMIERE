# Admin shipments (development only)

The Shipments tab derives its queues from eligible existing orders. Confirmed COD and paid orders are included; cancelled and unpaid online orders are excluded. Counts are all-time and independent of list filters. Packing is the dispatch queue, not a separate readiness confirmation.

1. Open Shipments with an authorized administrator session (MFA when required).
2. Check the stage counts and filter by stage, courier, order ID, tracking number, customer name or inclusive placed-date range (IST).
3. Select active orders on the current page (at most ten), download labels or packing slips as a ZIP, and extract the individual PDFs. Delivered orders are excluded from selection.
4. Manage an active shipment using the existing fulfillment transition endpoint. Carrier and tracking are recorded when marking shipped; test COD requires explicit cash collection confirmation on delivery.
5. History shows recorded admin fulfillment events only. It does not represent live courier tracking.
6. Invalid, stale or incomplete orders cause a whole batch to fail; no partial ZIP is returned. Batch generation is test-only, bounded to ten orders and 20 MiB of generated PDF content. No payment, courier booking or official carrier label is created.
