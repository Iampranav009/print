import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "10.224.2.95",
    "192.168.100.199",
    "localhost",
    "127.0.0.1",
    "exfoliate-conceded-hankie.ngrok-free.app",
    "exfoliate-conceded-hankie.ngrok-free.dev",
    "*.ngrok-free.app",
    "*.ngrok.io",
  ],
};

export default nextConfig;
