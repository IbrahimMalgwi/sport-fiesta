// app/layout.jsx
// Root layout (Server Component). Loads global styles, applies the no-flash
// dark-mode script, and wraps everything in the client Providers + shared
// Header/Footer shell.
import "./globals.css";
import Providers from "@/components/Providers";
import Layout from "@/components/Layout";

export const metadata = {
    title: "House Registration",
    description: "Teen program Sports Fiesta registration and house assignment",
    icons: {
        icon: "/logo.png",
        shortcut: "/logo.png",
        apple: "/logo.png",
    },
};

// Set the `dark` class before hydration so the theme doesn't flash.
const noFlashThemeScript = `
(function() {
  try {
    var saved = localStorage.getItem('darkMode');
    var isDark = saved !== null
      ? JSON.parse(saved)
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: noFlashThemeScript }} />
            </head>
            <body>
                <Providers>
                    <Layout>{children}</Layout>
                </Providers>
            </body>
        </html>
    );
}
