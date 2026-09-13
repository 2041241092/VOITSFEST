/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/register/colorfun",
        destination: "/colorfun/checkout",
        permanent: false,
      },
      {
        source: "/register/cfr",
        destination: "/colorfun/checkout",
        permanent: false,
      },
      {
        source: "/register/festival",
        destination: "/festival/checkout",
        permanent: false,
      },
      {
        source: "/register/seminar",
        destination: "/seminar/register",
        permanent: false,
      },
      {
        source: "/register/bcc",
        destination: "/competition/bcc/register",
        permanent: false,
      },
      {
        source: "/register/bpc",
        destination: "/competition/bpc/register",
        permanent: false,
      },
      {
        source: "/register/tenant",
        destination: "/tenant/register",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
