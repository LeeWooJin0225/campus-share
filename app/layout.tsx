import "./globals.css";

export const metadata = {
  title: "CampusShare",
  description: "성신여대 학생들을 위한 학습 자료 공유 서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}