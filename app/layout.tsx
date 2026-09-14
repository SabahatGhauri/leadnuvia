import "./globals.css";
export const metadata = {
  title: "LeadNuvia — Turn conversations into customers",
  description:
    "Build an AI sales assistant from your business knowledge. Answer website visitors, capture leads, and follow up with context.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
