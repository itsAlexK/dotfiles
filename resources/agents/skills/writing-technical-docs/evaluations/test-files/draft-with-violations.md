# Connection Pooling

Connection pooling is a robust technique that empowers services to reuse expensive TCP handshakes — it is important to note that the tradeoffs are nuanced.

A pool holds connections. A pool hands them out. A pool reclaims them on release.

Furthermore, you should tune the pool size carefully. If the pool is too small, requests queue, so latency rises, meaning throughput suffers. You MUST NOT set the maximum below your concurrency level.

In conclusion, connection pooling is a powerful tool that will transform your service's performance characteristics.
