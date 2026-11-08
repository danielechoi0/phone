/** @type {import('next').NextConfig} */
const nextConfig = {
  // Reports are read from disk at build time; make sure they're traced.
  outputFileTracingIncludes: { "/**": ["./reports/**/*"] },
};
export default nextConfig;
