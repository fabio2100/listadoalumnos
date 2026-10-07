"use client";

import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

export type Alumno = {
  _id?: string;
  nombre_y_apellido: string;
  dni: string;
  celular: string;
  va_al_curso?: boolean;
  observaciones?: string;
  isAdded?: boolean;
};

type TablaAlumno = Omit<Alumno, "va_al_curso"> & {
  va_al_curso: boolean;
};

const defaultForm = {
  nombre_y_apellido: "",
  dni: "",
  celular: "",
  va_al_curso: true,
  observaciones: "",
};

export function AlumnosTable({
  alumnos,
  error,
}: {
  alumnos: Alumno[];
  error?: string;
}) {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [agregados, setAgregados] = useState<Alumno[]>([]);
  const [formData, setFormData] = useState(defaultForm);
  const [editableAlumnos, setEditableAlumnos] = useState<TablaAlumno[]>([]);
  const nextLocalId = useRef(0);

  const allAlumnos = useMemo<TablaAlumno[]>(() => {
    const baseAlumnos: TablaAlumno[] = [...alumnos, ...agregados].map((alumno) => ({
      ...alumno,
      va_al_curso: Boolean(alumno.va_al_curso),
    }));

    if (editableAlumnos.length > 0) {
      const merged = [...baseAlumnos];
      editableAlumnos.forEach((editableAlumno) => {
        const index = merged.findIndex((alumno) => alumno._id === editableAlumno._id);

        if (index >= 0) {
          merged[index] = { ...merged[index], ...editableAlumno, va_al_curso: Boolean(editableAlumno.va_al_curso) };
        } else {
          merged.push({ ...editableAlumno, va_al_curso: Boolean(editableAlumno.va_al_curso) });
        }
      });

      return merged;
    }

    return baseAlumnos;
  }, [alumnos, agregados, editableAlumnos]);

  const filteredAlumnos = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    if (!normalizedQuery) {
      return allAlumnos;
    }

    return allAlumnos.filter((alumno) =>
      [alumno.nombre_y_apellido, alumno.dni, alumno.celular].some((field) =>
        String(field ?? "").toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [allAlumnos, search]);

  const filteredBaseAlumnos = filteredAlumnos.filter((alumno) => !alumno.isAdded);
  const filteredAddedAlumnos = filteredAlumnos.filter((alumno) => alumno.isAdded);

  const handleFormChange = (field: keyof typeof defaultForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === "va_al_curso" ? event.target.checked : event.target.value;
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setFormData(defaultForm);
    setIsModalOpen(false);
  };

  const handleAccept = async () => {
    if (!formData.nombre_y_apellido.trim() || !formData.dni.trim() || !formData.celular.trim()) {
      return;
    }

    const nuevoAlumno: TablaAlumno = {
      _id: `agregado-${nextLocalId.current++}`,
      nombre_y_apellido: formData.nombre_y_apellido.trim(),
      dni: formData.dni.trim(),
      celular: formData.celular.trim(),
      va_al_curso: Boolean(formData.va_al_curso),
      observaciones: formData.observaciones.trim(),
      isAdded: true,
    };

    const wasSaved = await saveNewAlumnosToDatabase([nuevoAlumno]);

    if (!wasSaved) {
      return;
    }

    setAgregados((current) => [...current, nuevoAlumno]);
    setEditableAlumnos((current) => [...current, nuevoAlumno]);
    resetForm();
  };

  const handleVaAlCursoChange = (id: string) => {
    setEditableAlumnos((current) => {
      const existing = current.find((alumno) => alumno._id === id);

      if (existing) {
        return current.map((alumno) =>
          alumno._id === id ? { ...alumno, va_al_curso: !Boolean(alumno.va_al_curso) } : alumno,
        );
      }

      const originalAlumno = [...alumnos, ...agregados].find((alumno) => alumno._id === id);
      const nextValue = !(Boolean(originalAlumno?.va_al_curso));

      return [
        ...current,
        {
          ...(originalAlumno ?? { _id: id, nombre_y_apellido: "", dni: "", celular: "" }),
          va_al_curso: nextValue,
        },
      ];
    });
  };

  const handleObservacionChange = (id: string, value: string) => {
    setEditableAlumnos((current) => {
      const existing = current.find((alumno) => alumno._id === id);

      if (existing) {
        return current.map((alumno) =>
          alumno._id === id ? { ...alumno, observaciones: value } : alumno,
        );
      }

      const originalAlumno = [...alumnos, ...agregados].find((alumno) => alumno._id === id);

      return [
        ...current,
        {
          ...(originalAlumno ?? { _id: id, nombre_y_apellido: "", dni: "", celular: "" }),
          va_al_curso: Boolean(originalAlumno?.va_al_curso),
          observaciones: value,
        },
      ];
    });
  };

  const saveNewAlumnosToDatabase = async (newAlumnos: Alumno[]) => {
    if (!newAlumnos.length) {
      return false;
    }

    try {
      const response = await fetch("/api/alumnos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alumnos: newAlumnos }),
      });

      if (!response.ok) {
        throw new Error("Error al guardar alumnos.");
      }

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const exportToCsv = (rows: TablaAlumno[]) => {
    const workbook = XLSX.utils.book_new();
    const sheetData = rows.map((alumno) => ({
      nombre_y_apellido: alumno.nombre_y_apellido,
      dni: alumno.dni,
      celular: alumno.celular,
      observaciones: alumno.observaciones ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Alumnos");
    XLSX.writeFile(workbook, "alumnos-va-al-curso.csv");
  };

  const exportToPdf = (rows: TablaAlumno[]) => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Alumnos con curso", 14, 16);

    autoTable(doc, {
      head: [["Nombre y apellido", "DNI", "Celular", "Observaciones"]],
      body: rows.map((alumno) => [alumno.nombre_y_apellido, alumno.dni, alumno.celular, alumno.observaciones ?? ""]),
      startY: 24,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save("alumnos-va-al-curso.pdf");
  };

  const handleExport = (type: "pdf" | "csv") => {
    const exportRows = [...allAlumnos]
      .filter((alumno) => alumno.va_al_curso)
      .sort((a, b) => a.nombre_y_apellido.localeCompare(b.nombre_y_apellido, "es", { sensitivity: "base" }));

    if (type === "pdf") {
      exportToPdf(exportRows);
      return;
    }

    exportToCsv(exportRows);
  };

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "center",
          gap: 2,
        }}
      >
        <TextField
          fullWidth
          size="small"
          label="Buscar alumno"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nombre, DNI o celular"
          aria-label="Buscar alumno"
          sx={{ maxWidth: 440 }}
        />

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button variant="contained" color="primary" onClick={() => setIsModalOpen(true)}>
            Agregar alumno
          </Button>
          <Button variant="outlined" color="secondary" onClick={() => void handleExport("pdf")}>
            Guardar PDF
          </Button>
          <Button variant="outlined" color="secondary" onClick={() => void handleExport("csv")}>
            Guardar CSV
          </Button>
        </Box>
      </Box>

      {error ? (
        <Typography color="error.main" variant="body2">
          {error}
        </Typography>
      ) : (
        <TableContainer component={Paper} sx={{ bgcolor: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.2)" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre y apellido</TableCell>
                <TableCell>DNI</TableCell>
                <TableCell>Celular</TableCell>
                <TableCell align="center">Va al curso</TableCell>
                <TableCell>Observaciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBaseAlumnos.length > 0 || filteredAddedAlumnos.length > 0 ? (
                <>
                  {filteredBaseAlumnos.map((alumno, index) => (
                    <TableRow key={alumno._id ?? `${alumno.dni}-${index}`} hover>
                      <TableCell>{alumno.nombre_y_apellido}</TableCell>
                      <TableCell>{alumno.dni}</TableCell>
                      <TableCell>{alumno.celular}</TableCell>
                      <TableCell align="center">
                        <Checkbox
                          checked={Boolean(alumno.va_al_curso)}
                          onChange={() => handleVaAlCursoChange(alumno._id ?? `${alumno.dni}-${index}`)}
                          aria-label={`Va al curso: ${alumno.nombre_y_apellido}`}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={alumno.observaciones ?? ""}
                          onChange={(event) => handleObservacionChange(alumno._id ?? `${alumno.dni}-${index}`, event.target.value)}
                          placeholder="Observación"
                          fullWidth
                        />
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredAddedAlumnos.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 1.5, color: "#a5b4fc", fontWeight: 700, letterSpacing: 0.8 }}>
                        Agregados manualmente
                      </TableCell>
                    </TableRow>
                  )}

                  {filteredAddedAlumnos.map((alumno, index) => (
                    <TableRow key={alumno._id ?? `${alumno.dni}-${index}`} hover sx={{ backgroundColor: "rgba(139, 92, 246, 0.08)" }}>
                      <TableCell>{alumno.nombre_y_apellido}</TableCell>
                      <TableCell>{alumno.dni}</TableCell>
                      <TableCell>{alumno.celular}</TableCell>
                      <TableCell align="center">
                        <Checkbox
                          checked={Boolean(alumno.va_al_curso)}
                          onChange={() => handleVaAlCursoChange(alumno._id ?? `${alumno.dni}-${index}`)}
                          aria-label={`Va al curso: ${alumno.nombre_y_apellido}`}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={alumno.observaciones ?? ""}
                          onChange={(event) => handleObservacionChange(alumno._id ?? `${alumno.dni}-${index}`, event.target.value)}
                          placeholder="Observación"
                          fullWidth
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No se encontraron registros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={isModalOpen} onClose={resetForm} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar alumno</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Nombre y apellido"
              value={formData.nombre_y_apellido}
              onChange={handleFormChange("nombre_y_apellido")}
            />
            <TextField
              label="DNI"
              value={formData.dni}
              onChange={handleFormChange("dni")}
            />
            <TextField
              label="Celular"
              value={formData.celular}
              onChange={handleFormChange("celular")}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.va_al_curso}
                  onChange={handleFormChange("va_al_curso")}
                />
              }
              label="Va al curso"
            />
            <TextField
              label="Observaciones"
              value={formData.observaciones}
              onChange={handleFormChange("observaciones")}
              placeholder="Ingrese una observación"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetForm}>Cancelar</Button>
          <Button variant="contained" onClick={handleAccept}>
            Aceptar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
