const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "cateros.com",
        "www.cateros.com",
        "cateros-clean.vercel.app",
      ],
    },
  },
};

export default nextConfig;
