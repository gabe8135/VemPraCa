import { NextResponse } from "next/server";

export function middleware(request) {
  const url = request.nextUrl;
  // Cache agressivo para imagens otimizadas pelo Next.js
  if (url.pathname.startsWith("/_next/image")) {
    const response = NextResponse.next();
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
    return response;
  }
  // Compatibilidade: redireciona slug antigo da Tenda 10 para o novo slug
  if (url.pathname === "/eventos/festa-caicara/estandes/tenda-10") {
    url.pathname = "/eventos/festa-caicara/estandes/rancho-alegre";
    return NextResponse.redirect(url);
  }
  // Compatibilidade inversa: se apontarem para o novo slug e a versão ativa não tiver, redireciona para o antigo
  if (url.pathname === "/eventos/festa-caicara/estandes/rancho-alegre") {
    url.pathname = "/eventos/festa-caicara/estandes/tenda-10";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
