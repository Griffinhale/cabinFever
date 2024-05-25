import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-white-100/10 items-center justify-between p-4" style={{ zIndex: 2, position: 'relative' }}>
      <div className="bg-slate-800/90 min-h-screen h-[400rem] min-w-screen overflow-hidden border-black rounded-2xl border-2 items-center justify-between m-4">
        <p className=" flex justify-center items-center">Testing</p>
      </div>
    </main>
  );
}
