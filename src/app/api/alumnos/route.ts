import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const alumnos = Array.isArray(body?.alumnos) ? body.alumnos : [];

    if (!alumnos.length) {
      return NextResponse.json({ insertedCount: 0, message: "No hay alumnos para guardar." });
    }

    const { db } = await connectToDatabase();

    const documents = alumnos.map((alumno: { nombre_y_apellido?: string; dni?: string; celular?: string; va_al_curso?: boolean; observaciones?: string }) => ({
      nombre_y_apellido: String(alumno?.nombre_y_apellido ?? "").trim(),
      dni: String(alumno?.dni ?? "").trim(),
      celular: String(alumno?.celular ?? "").trim(),
      va_al_curso: Boolean(alumno?.va_al_curso),
      observaciones: String(alumno?.observaciones ?? "").trim(),
      createdAt: new Date(),
    }));

    const result = await db.collection("alumnos").insertMany(documents);

    return NextResponse.json({ insertedCount: result.insertedCount });
  } catch (error) {
    console.error("Error saving alumnos:", error);
    return NextResponse.json(
      { error: "No se pudieron guardar los alumnos." },
      { status: 500 },
    );
  }
}
