-- CreateTable
CREATE TABLE "IPO" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sector" TEXT NOT NULL DEFAULT 'Other',
    "issuerCompany" TEXT NOT NULL,
    "exchange" TEXT NOT NULL DEFAULT 'BOTH',
    "priceBandLow" DOUBLE PRECISION,
    "priceBandHigh" DOUBLE PRECISION,
    "issueSize" DOUBLE PRECISION,
    "lotSize" INTEGER,
    "freshIssue" DOUBLE PRECISION,
    "ofs" DOUBLE PRECISION,
    "openDate" TIMESTAMP(3),
    "closeDate" TIMESTAMP(3),
    "allotmentDate" TIMESTAMP(3),
    "listingDate" TIMESTAMP(3),
    "revenue" DOUBLE PRECISION,
    "netProfit" DOUBLE PRECISION,
    "peRatio" DOUBLE PRECISION,
    "roe" DOUBLE PRECISION,
    "roce" DOUBLE PRECISION,
    "debtToEquity" DOUBLE PRECISION,
    "registrar" TEXT,
    "leadManagers" TEXT[],
    "objectives" TEXT,
    "promoterHolding" DOUBLE PRECISION,
    "drhpUrl" TEXT,
    "rhpUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IPO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPOSubscription" (
    "id" TEXT NOT NULL,
    "ipoId" TEXT NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day" INTEGER NOT NULL,
    "qibTimes" DOUBLE PRECISION,
    "hniTimes" DOUBLE PRECISION,
    "retailTimes" DOUBLE PRECISION,
    "totalTimes" DOUBLE PRECISION,
    "employeeTimes" DOUBLE PRECISION,
    "applications" INTEGER,
    "source" TEXT NOT NULL,

    CONSTRAINT "IPOSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPOGmp" (
    "id" TEXT NOT NULL,
    "ipoId" TEXT NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gmpAmount" DOUBLE PRECISION NOT NULL,
    "gmpPercent" DOUBLE PRECISION NOT NULL,
    "kostak" DOUBLE PRECISION,
    "subject" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'investorgain.com',

    CONSTRAINT "IPOGmp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPOPrediction" (
    "id" TEXT NOT NULL,
    "ipoId" TEXT NOT NULL,
    "predictedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DOUBLE PRECISION NOT NULL,
    "label" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "gmpSignal" DOUBLE PRECISION,
    "subscriptionSignal" DOUBLE PRECISION,
    "marketSignal" DOUBLE PRECISION,
    "fundamentalSignal" DOUBLE PRECISION,
    "sectorSignal" DOUBLE PRECISION,
    "featuresJson" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "disclaimer" TEXT NOT NULL DEFAULT 'This is an AI-based educational tool. Not SEBI-registered investment advice.',

    CONSTRAINT "IPOPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPOResult" (
    "id" TEXT NOT NULL,
    "ipoId" TEXT NOT NULL,
    "listingPrice" DOUBLE PRECISION NOT NULL,
    "listingGain" DOUBLE PRECISION NOT NULL,
    "dayHigh" DOUBLE PRECISION,
    "dayLow" DOUBLE PRECISION,
    "closeD1" DOUBLE PRECISION,
    "closeW1" DOUBLE PRECISION,
    "actualLabel" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IPOResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketContext" (
    "id" TEXT NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nifty50" DOUBLE PRECISION NOT NULL,
    "nifty50Chg" DOUBLE PRECISION NOT NULL,
    "bankNifty" DOUBLE PRECISION NOT NULL,
    "bankNiftyChg" DOUBLE PRECISION NOT NULL,
    "vix" DOUBLE PRECISION NOT NULL,
    "marketStatus" TEXT NOT NULL,

    CONSTRAINT "MarketContext_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IPO_slug_key" ON "IPO"("slug");

-- CreateIndex
CREATE INDEX "IPO_status_idx" ON "IPO"("status");

-- CreateIndex
CREATE INDEX "IPO_listingDate_idx" ON "IPO"("listingDate");

-- CreateIndex
CREATE INDEX "IPO_sector_idx" ON "IPO"("sector");

-- CreateIndex
CREATE INDEX "IPO_category_idx" ON "IPO"("category");

-- CreateIndex
CREATE INDEX "IPOSubscription_ipoId_scrapedAt_idx" ON "IPOSubscription"("ipoId", "scrapedAt");

-- CreateIndex
CREATE INDEX "IPOGmp_ipoId_scrapedAt_idx" ON "IPOGmp"("ipoId", "scrapedAt");

-- CreateIndex
CREATE INDEX "IPOPrediction_ipoId_predictedAt_idx" ON "IPOPrediction"("ipoId", "predictedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IPOResult_ipoId_key" ON "IPOResult"("ipoId");

-- CreateIndex
CREATE INDEX "MarketContext_scrapedAt_idx" ON "MarketContext"("scrapedAt");

-- AddForeignKey
ALTER TABLE "IPOSubscription" ADD CONSTRAINT "IPOSubscription_ipoId_fkey" FOREIGN KEY ("ipoId") REFERENCES "IPO"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPOGmp" ADD CONSTRAINT "IPOGmp_ipoId_fkey" FOREIGN KEY ("ipoId") REFERENCES "IPO"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPOPrediction" ADD CONSTRAINT "IPOPrediction_ipoId_fkey" FOREIGN KEY ("ipoId") REFERENCES "IPO"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPOResult" ADD CONSTRAINT "IPOResult_ipoId_fkey" FOREIGN KEY ("ipoId") REFERENCES "IPO"("id") ON DELETE CASCADE ON UPDATE CASCADE;
