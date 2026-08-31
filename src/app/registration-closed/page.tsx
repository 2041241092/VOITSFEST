export default function RegistrationClosedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Pendaftaran Ditutup</h1>
        <p className="mt-4 text-gray-600">
          {/* TODO: Fetch message from CMS registration_closed_message */}
          Pendaftaran telah ditutup. Terima kasih atas antusiasme Anda!
        </p>
      </div>
    </main>
  );
}
