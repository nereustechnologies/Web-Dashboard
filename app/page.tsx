import Link from "next/link"
import { Button } from "@/components/ui/button"
import { NereusLogo } from "@/components/nereus-logo"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center justify-center gap-8 max-w-3xl text-center">
        <NereusLogo className="w-24 h-24 md:w-32 md:h-32" />

        <h1 className="text-4xl font-bold tracking-tight">Nereus IMU Testing Platform</h1>

        <p className="my-8 bg-clip-text text-center font-poppins text-[2rem] font-bold italic text-[#00D4EF] lg:text-[4rem]">
          From Data to Dominance -<br /> Lead with Nereus
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Button asChild size="lg" className="bg-[#00D4EF] text-black hover:bg-[#00D4EF]/90">
            <Link href="/login">Login to Platform</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
