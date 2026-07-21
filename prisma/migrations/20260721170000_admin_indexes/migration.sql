CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE INDEX "Product_category_isActive_idx" ON "Product"("category", "isActive");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "Order_email_idx" ON "Order"("email");
CREATE INDEX "BuybackRequest_status_createdAt_idx" ON "BuybackRequest"("status", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
