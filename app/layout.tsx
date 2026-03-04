// Root layout is a passthrough — <html> is rendered by app/[locale]/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
