import { BookingFlow } from "@/app/booking-flow";

export default function HomePage() {
  return (
    <main>
      <header className="hero">
        <p className="brand">Ottodot</p>
        <h1>Trial class booking</h1>
        <p>Book a child’s trial class, simulate payment, and verify the confirmed roster.</p>
      </header>
      <BookingFlow />
    </main>
  );
}
