import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow FullCalendar to be transpiled
  transpilePackages: ['@fullcalendar/react', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/interaction', '@fullcalendar/core'],
};

export default nextConfig;
