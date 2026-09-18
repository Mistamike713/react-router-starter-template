CREATE TABLE IF NOT EXISTS mailing_subscribers (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','unsubscribed','suppressed')),
 requested_at INTEGER NOT NULL,
 confirmed_at INTEGER,
 unsubscribed_at INTEGER,
 consent_version TEXT NOT NULL DEFAULT 'welcome15-v1',
 confirmation_sent_at INTEGER,
 welcome_sent_at INTEGER,
 stripe_customer_id TEXT,
 stripe_promotion_id TEXT,
 coupon_code TEXT NOT NULL UNIQUE,
 resend_contact_id TEXT
);
CREATE TABLE IF NOT EXISTS mailing_rate_limits (
 bucket TEXT PRIMARY KEY,
 attempts INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
