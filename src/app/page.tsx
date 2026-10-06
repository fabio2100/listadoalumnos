import { AlumnosTable, type Alumno } from "@/components/alumnos-table";
import { connectToDatabase } from "@/lib/mongodb";
import { Box, Typography } from "@mui/material";
import styles from "./page.module.css";

async function getAlumnos(): Promise<Alumno[]> {
  try {
    const { db } = await connectToDatabase();

    const alumnos = await db
      .collection("alumnos")
      .find({}, { projection: { _id: 1, nombre_y_apellido: 1, dni: 1, celular: 1 } })
      .sort({ nombre_y_apellido: 1 })
      .toArray();

    return alumnos.map((alumno) => ({
      _id: String(alumno._id),
      nombre_y_apellido: String(alumno.nombre_y_apellido ?? ""),
      dni: String(alumno.dni ?? ""),
      celular: String(alumno.celular ?? ""),
    }));
  } catch (error) {
    console.error("Error fetching alumnos:", error);
    return [];
  }
}

export default async function Home() {
  const alumnos = await getAlumnos();

  return (
    <main className={styles.page}>
      <Box component="section" className={styles.container} sx={{ bgcolor: "background.paper", border: "1px solid rgba(148, 163, 184, 0.2)" }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: 2, display: "block" }}>
            Listado
          </Typography>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
            Alumnos
          </Typography>
        </Box>

        <AlumnosTable alumnos={alumnos} />
      </Box>
    </main>
  );
}
