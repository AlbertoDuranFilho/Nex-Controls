export default function InfoBanner() {
  return (
    <div className="absolute bottom-0 left-0 w-full z-30">
    <div className="hidden md:flex bg-blue-900/90 text-white divide-x divide-white/20">
      <div className="flex-1 flex items-center justify-center gap-2 py-4">
        📱 <div className="text-center">
          <p className="font-bold">Aplicativo</p>
          <p className="text-sm">Temos nosso app</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-2 py-4">
        🚚 <div className="text-center">
          <p className="font-bold">Exportamos</p>
          <p className="text-sm">Mais de 10 países</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-2 py-4">
        💬 <div className="text-center">
          <p className="font-bold">Atendimento</p>
          <p className="text-sm">Via WhatsApp</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-2 py-4">
        🛡️ <div className="text-center">
          <p className="font-bold">Site seguro</p>
          <p className="text-sm">Seus dados protegidos</p>
        </div>
      </div>
    </div>
  </div>
  );
}