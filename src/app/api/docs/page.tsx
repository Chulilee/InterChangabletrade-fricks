'use client';

import { useEffect } from 'react';

export default function DocsPage() {
  useEffect(() => {
    // Load Swagger UI from CDN
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js';
    script.onload = () => {
      // @ts-expect-error - SwaggerUIBundle is injected onto window by the CDN script
      window.SwaggerUIBundle({
        url: '/api/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          // @ts-expect-error - SwaggerUIBundle is injected onto window by the CDN script
          window.SwaggerUIBundle.presets.apis,
          // @ts-expect-error - SwaggerUIStandalonePreset is injected onto window by the CDN script
          window.SwaggerUIStandalonePreset,
        ],
        layout: 'BaseLayout',
      });
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div id="swagger-ui" />
    </div>
  );
}