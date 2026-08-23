import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Project } from '@/types';
import { HdPlus, HdEdit, HdTrash, HdClock, HdDollarSign, HdUsers, HdChevronDown, HdAlertTriangle, HdLock, HdUnlock, HdEyeOff, HdEye } from '@/components/ui/HandDrawnIcons';
import api from '@/services/api';

interface ProfessionRole {
  id: string;
  name: string;
  description: string | null;
  hourlyRate: number | null;
  dailyRate: number | null;
  billingType?: 'HOUR' | 'DAY' | 'M2' | 'ML' | 'BOCA';
  ratePerUnit?: number | null;
  bocaRates?: { label: string; price: number }[];
}

interface TaskDetail {
  id: string;
  name: string;
  description: string;
  estimatedHours?: number;
  quantity?: number;
  unit?: string;
  bocaType?: string;
  laborCost?: number;
  status: 'pending' | 'in_progress' | 'completed';
  assignedRole?: string;
  assignedRoleId?: string;
}

interface TasksManagerProps {
  project: Project;
  onSave: (tasks: Record<string, TaskDetail[]>) => Promise<void>;
  onUpdateProjectSettings: (exportSettings: Record<string, unknown>) => Promise<void>;
}

const DEFAULT_BUDGET_LIMIT = 5_000_000;
const LABOR_BUDGET_STORAGE_KEY = 'poolcalc:labor-budget-limit';
const LABOR_BUDGET_HIDDEN_STORAGE_KEY = 'poolcalc:labor-budget-hidden';

const normalizeTaskValue = (value?: string | number | null) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const buildTaskFingerprint = (category: string, task: TaskDetail) =>
  [
    category,
    normalizeTaskValue(task.name),
    normalizeTaskValue(task.description),
    normalizeTaskValue(task.assignedRoleId || task.assignedRole),
    Number(task.estimatedHours || 0).toFixed(2),
    Number(task.quantity || 0).toFixed(2),
    normalizeTaskValue(task.unit),
    normalizeTaskValue(task.bocaType),
    Number(task.laborCost || 0).toFixed(2),
  ].join('|');

const analyzeTasks = (tasks: Record<string, TaskDetail[]>) => {
  const seenFingerprints = new Set<string>();
  const cleanedTasks: Record<string, TaskDetail[]> = {};
  let rawLaborCost = 0;
  let cleanLaborCost = 0;
  let duplicateLaborCost = 0;
  let duplicateCount = 0;

  Object.entries(tasks || {}).forEach(([category, categoryTasks]) => {
    const safeTasks = Array.isArray(categoryTasks) ? categoryTasks : [];
    cleanedTasks[category] = [];

    safeTasks.forEach((task) => {
      rawLaborCost += task.laborCost || 0;
      const fingerprint = buildTaskFingerprint(category, task);

      if (seenFingerprints.has(fingerprint)) {
        duplicateCount += 1;
        duplicateLaborCost += task.laborCost || 0;
        return;
      }

      seenFingerprints.add(fingerprint);
      cleanedTasks[category].push(task);
      cleanLaborCost += task.laborCost || 0;
    });
  });

  return {
    cleanedTasks,
    rawLaborCost,
    cleanLaborCost,
    duplicateLaborCost,
    duplicateCount,
  };
};

export const TasksManager: React.FC<TasksManagerProps> = ({ project, onSave, onUpdateProjectSettings }) => {
  const [tasks, setTasks] = useState<Record<string, TaskDetail[]>>({});
  const [roles, setRoles] = useState<ProfessionRole[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDetail | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('excavation');
  const [budgetWidgetCollapsed, setBudgetWidgetCollapsed] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState(DEFAULT_BUDGET_LIMIT);
  const [budgetWidgetHidden, setBudgetWidgetHidden] = useState(false);
  const [taskAutomationLocked, setTaskAutomationLocked] = useState(Boolean(project.exportSettings?.taskAutomationLocked));
  const [savingAutomationSetting, setSavingAutomationSetting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    estimatedHours: 0,
    quantity: 0,
    unit: '',
    bocaType: '',
    laborCost: 0,
    status: 'pending' as 'pending' | 'in_progress' | 'completed',
    assignedRole: '',
    assignedRoleId: '',
  });

  useEffect(() => {
    if (project.tasks && typeof project.tasks === 'object') {
      setTasks(project.tasks as Record<string, TaskDetail[]>);
    }
    setTaskAutomationLocked(Boolean(project.exportSettings?.taskAutomationLocked));
    loadRoles();
  }, [project]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedLimit = window.localStorage.getItem(LABOR_BUDGET_STORAGE_KEY);
    const parsedLimit = storedLimit ? Number(storedLimit) : DEFAULT_BUDGET_LIMIT;
    if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
      setBudgetLimit(parsedLimit);
    }

    setBudgetWidgetHidden(window.localStorage.getItem(LABOR_BUDGET_HIDDEN_STORAGE_KEY) === '1');
  }, []);

  const calculateLaborCost = (
    role: ProfessionRole | undefined,
    hours: number,
    quantity: number,
    bocaType: string
  ) => {
    if (!role) return 0;
    const billingType = role.billingType || 'HOUR';

    if (billingType === 'M2' || billingType === 'ML') {
      if (!role.ratePerUnit || quantity <= 0) return 0;
      return quantity * role.ratePerUnit;
    }

    if (billingType === 'BOCA') {
      if (!role.bocaRates || !bocaType || quantity <= 0) return 0;
      const rate = role.bocaRates.find((item) => item.label === bocaType)?.price || 0;
      return quantity * rate;
    }

    const hourlyRate = role.hourlyRate || (role.dailyRate ? role.dailyRate / 8 : 0);
    if (!hourlyRate || hours <= 0) return 0;
    return hours * hourlyRate;
  };

  const loadRoles = async () => {
    try {
      const response = await api.get('/profession-roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Error al cargar roles:', error);
    }
  };

  const categories = [
    { id: 'excavation', label: 'Excavación' },
    { id: 'hydraulic', label: 'Instalación Hidráulica' },
    { id: 'electrical', label: 'Instalación Eléctrica' },
    { id: 'floor', label: 'Solado y Cama' },
    { id: 'tiles', label: 'Colocación de Losetas' },
    { id: 'finishes', label: 'Terminaciones' },
    { id: 'additionals', label: 'Adicionales' },
    { id: 'other', label: 'Otras Tareas' },
  ];

  const handleAddTask = () => {
    setEditingTask(null);
    setFormData({
      name: '',
      description: '',
      estimatedHours: 0,
      quantity: 0,
      unit: '',
      bocaType: '',
      laborCost: 0,
      status: 'pending',
      assignedRole: '',
      assignedRoleId: '',
    });
    setShowModal(true);
  };

  const handleEditTask = (category: string, task: TaskDetail) => {
    setEditingTask(task);
    setSelectedCategory(category);
    setFormData({
      name: task.name,
      description: task.description,
      estimatedHours: task.estimatedHours || 0,
      quantity: task.quantity || 0,
      unit: task.unit || '',
      bocaType: task.bocaType || '',
      laborCost: task.laborCost || 0,
      status: task.status,
      assignedRole: task.assignedRole || '',
      assignedRoleId: task.assignedRoleId || '',
    });
    setShowModal(true);
  };

  const handleDeleteTask = async (category: string, taskId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;

    const previousTasks = tasks;
    const updatedTasks = { ...tasks };
    updatedTasks[category] = (updatedTasks[category] || []).filter(t => t.id !== taskId);
    setTasks(updatedTasks);

    try {
      if (!taskAutomationLocked) {
        await onUpdateProjectSettings({
          ...(project.exportSettings || {}),
          taskAutomationLocked: true,
        });
        setTaskAutomationLocked(true);
      }
      await onSave(updatedTasks);
    } catch (error) {
      console.error('Error al guardar tareas:', error);
      setTasks(previousTasks);
      alert('Error al eliminar la tarea');
    }
  };

  const handleRoleChange = (roleId: string) => {
    const selectedRole = roles.find(r => r.id === roleId);
    if (selectedRole) {
      const calculatedCost = calculateLaborCost(
        selectedRole,
        formData.estimatedHours,
        formData.quantity,
        formData.bocaType
      );

      setFormData({
        ...formData,
        assignedRoleId: roleId,
        assignedRole: selectedRole.name,
        laborCost: calculatedCost,
        unit: selectedRole.billingType === 'M2' ? 'm2' : selectedRole.billingType === 'ML' ? 'ml' : selectedRole.billingType === 'BOCA' ? 'boca' : formData.unit,
      });
    } else {
      setFormData({
        ...formData,
        assignedRoleId: '',
        assignedRole: '',
      });
    }
  };

  const handleHoursChange = (hours: number) => {
    const selectedRole = roles.find(r => r.id === formData.assignedRoleId);
    const calculatedCost = calculateLaborCost(
      selectedRole,
      hours,
      formData.quantity,
      formData.bocaType
    );

    setFormData({
      ...formData,
      estimatedHours: hours,
      laborCost: calculatedCost,
    });
  };

  const handleQuantityChange = (quantity: number) => {
    const selectedRole = roles.find(r => r.id === formData.assignedRoleId);
    const calculatedCost = calculateLaborCost(
      selectedRole,
      formData.estimatedHours,
      quantity,
      formData.bocaType
    );
    setFormData({
      ...formData,
      quantity,
      laborCost: calculatedCost,
    });
  };

  const handleBocaTypeChange = (bocaType: string) => {
    const selectedRole = roles.find(r => r.id === formData.assignedRoleId);
    const calculatedCost = calculateLaborCost(
      selectedRole,
      formData.estimatedHours,
      formData.quantity,
      bocaType
    );
    setFormData({
      ...formData,
      bocaType,
      laborCost: calculatedCost,
    });
  };

  const handleSaveTask = async () => {
    if (!formData.name.trim()) {
      alert('El nombre de la tarea es obligatorio');
      return;
    }

    const newTask: TaskDetail = {
      id: editingTask?.id || `task-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      estimatedHours: formData.estimatedHours,
      quantity: formData.quantity,
      unit: formData.unit,
      bocaType: formData.bocaType,
      laborCost: formData.laborCost,
      status: formData.status,
      assignedRole: formData.assignedRole,
      assignedRoleId: formData.assignedRoleId,
    };

    const updatedTasks = { ...tasks };
    if (!updatedTasks[selectedCategory]) {
      updatedTasks[selectedCategory] = [];
    }

    if (editingTask) {
      const index = updatedTasks[selectedCategory].findIndex(t => t.id === editingTask.id);
      if (index !== -1) {
        updatedTasks[selectedCategory][index] = newTask;
      }
    } else {
      updatedTasks[selectedCategory].push(newTask);
    }

    setTasks(updatedTasks);
    setShowModal(false);

    try {
      if (!taskAutomationLocked) {
        await onUpdateProjectSettings({
          ...(project.exportSettings || {}),
          taskAutomationLocked: true,
        });
        setTaskAutomationLocked(true);
      }
      await onSave(updatedTasks);
    } catch (error) {
      console.error('Error al guardar tareas:', error);
    }
  };


  const getTotalsByCategory = (categoryTasks: TaskDetail[]) => {
    const totalHours = categoryTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const totalCost = categoryTasks.reduce((sum, t) => sum + (t.laborCost || 0), 0);
    return { totalHours, totalCost };
  };

  const selectedRole = roles.find(r => r.id === formData.assignedRoleId);
  const selectedBillingType = selectedRole?.billingType || 'HOUR';
  const { cleanedTasks, rawLaborCost, cleanLaborCost, duplicateLaborCost, duplicateCount } = analyzeTasks(tasks);
  const remainingBudget = budgetLimit - cleanLaborCost;
  const isOverBudget = remainingBudget < 0;

  const persistBudgetLimit = (nextValue: number) => {
    setBudgetLimit(nextValue);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LABOR_BUDGET_STORAGE_KEY, String(nextValue));
    }
  };

  const handleBudgetLimitChange = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;
    persistBudgetLimit(value);
  };

  const handleBudgetWidgetVisibility = (hidden: boolean) => {
    setBudgetWidgetHidden(hidden);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LABOR_BUDGET_HIDDEN_STORAGE_KEY, hidden ? '1' : '0');
    }
  };

  const handleAutomationToggle = async () => {
    const nextLocked = !taskAutomationLocked;
    if (!nextLocked) {
      const confirmed = confirm('Si activás el recálculo automático, futuros cambios en hidráulica, eléctrica o adicionales podrán volver a ajustar tareas y mano de obra. ¿Continuar?');
      if (!confirmed) return;
    }
    setSavingAutomationSetting(true);
    try {
      await onUpdateProjectSettings({
        ...(project.exportSettings || {}),
        taskAutomationLocked: nextLocked,
      });
      setTaskAutomationLocked(nextLocked);
    } catch (error) {
      console.error('Error al actualizar bloqueo de recálculo:', error);
      alert('No se pudo actualizar el bloqueo de recálculo automático');
    } finally {
      setSavingAutomationSetting(false);
    }
  };

  const handleRemoveDuplicates = async () => {
    if (duplicateCount === 0) return;

    const confirmed = confirm(`Se eliminarán ${duplicateCount} tarea(s) duplicada(s) exacta(s) de la lista. ¿Continuar?`);
    if (!confirmed) return;

    const previousTasks = tasks;
    setTasks(cleanedTasks);

    try {
      if (!taskAutomationLocked) {
        await onUpdateProjectSettings({
          ...(project.exportSettings || {}),
          taskAutomationLocked: true,
        });
        setTaskAutomationLocked(true);
      }
      await onSave(cleanedTasks);
    } catch (error) {
      console.error('Error al limpiar tareas duplicadas:', error);
      setTasks(previousTasks);
      alert('No se pudieron limpiar las tareas duplicadas');
    }
  };

  return (
    <div className="relative space-y-6 pb-28">

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Gestión de Tareas del Proyecto</h3>
        <div className="flex items-center gap-3">
          {duplicateCount > 0 && (
            <Button variant="outline" onClick={handleRemoveDuplicates}>
              <HdAlertTriangle size={18} className="mr-2" />
              Limpiar duplicadas
            </Button>
          )}
          <Button onClick={handleAddTask}>
            <HdPlus size={20} className="mr-2" />
            Nueva Tarea
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Recálculo automático de tareas y mano de obra</p>
            <p className="mt-1 text-sm text-zinc-300">
              Al editar tareas manualmente, este proyecto queda bloqueado para que roles, horas y precios no se vuelvan a mover solos.
            </p>
          </div>
          <Button variant={taskAutomationLocked ? 'secondary' : 'outline'} onClick={handleAutomationToggle} disabled={savingAutomationSetting}>
            {taskAutomationLocked ? <HdLock size={18} className="mr-2" /> : <HdUnlock size={18} className="mr-2" />}
            {taskAutomationLocked ? 'Automático bloqueado' : 'Automático activo'}
          </Button>
        </div>
      </Card>

      {categories.map(category => {
        const categoryTasks = tasks[category.id] || [];
        const { totalHours, totalCost } = getTotalsByCategory(categoryTasks);

        return (
          <Card key={category.id}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-semibold">{category.label}</h4>
              <div className="flex gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <HdClock size={16} />
                  {totalHours.toFixed(1)} hs
                </span>
              </div>
            </div>

            {categoryTasks.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No hay tareas en esta categoría</p>
            ) : (
              <div className="space-y-2">
                {categoryTasks.map(task => (
                  <div key={task.id} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium">{task.name}</h5>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        <div className="flex gap-4 text-xs text-gray-500">
                          {task.estimatedHours && (
                            <span className="flex items-center gap-1">
                              <HdClock size={12} />
                              {task.estimatedHours} horas
                            </span>
                          )}
                          {task.quantity && (
                            <span className="flex items-center gap-1">
                              <HdUsers size={12} />
                              {task.quantity} {task.unit || ''}
                              {task.bocaType ? ` · ${task.bocaType}` : ''}
                            </span>
                          )}
                          {task.assignedRole && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                              </svg>
                              {task.assignedRole}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditTask(category.id, task)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <HdEdit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(category.id, task.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <HdTrash size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
      >

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Categoría</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          <Input
            label="Nombre de la tarea *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej: Excavación del terreno"
          />

          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
              placeholder="Describe los detalles de la tarea..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Rol asignado</label>
            <select
              value={formData.assignedRoleId}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">Sin asignar</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {formData.assignedRoleId && (
              <p className="text-xs text-gray-500 mt-1">
                El valor se calcula solo según la tarifa del rol y se ajusta desde la pestaña Costos.
              </p>
            )}
          </div>

          {selectedBillingType === 'BOCA' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de boca</label>
                <select
                  value={formData.bocaType}
                  onChange={(e) => handleBocaTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Seleccionar</option>
                  {(selectedRole?.bocaRates || []).map((rate) => (
                    <option key={rate.label} value={rate.label}>
                      {rate.label}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Cantidad de bocas"
                type="number"
                value={formData.quantity}
                onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 0)}
                min={0}
                step={1}
              />
            </div>
          )}

          {(selectedBillingType === 'M2' || selectedBillingType === 'ML') && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={`Cantidad (${selectedBillingType === 'M2' ? 'm²' : 'ml'})`}
                type="number"
                value={formData.quantity}
                onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 0)}
                min={0}
                step={0.1}
              />
              <Input
                label="Unidad"
                value={formData.unit || (selectedBillingType === 'M2' ? 'm2' : 'ml')}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
          )}

          {(selectedBillingType === 'HOUR' || selectedBillingType === 'DAY') && (
            <Input
              label="Horas estimadas"
              type="number"
              value={formData.estimatedHours}
              onChange={(e) => handleHoursChange(parseFloat(e.target.value) || 0)}
              min={0}
              step={0.5}
            />
          )}

          {(selectedBillingType === 'M2' || selectedBillingType === 'ML' || selectedBillingType === 'BOCA') && (
            <Input
              label="Horas estimadas (opcional)"
              type="number"
              value={formData.estimatedHours}
              onChange={(e) => handleHoursChange(parseFloat(e.target.value) || 0)}
              min={0}
              step={0.5}
            />
          )}

          <p className="text-xs text-gray-500">
            El valor de mano de obra de la tarea se carga y edita desde la pestaña Costos.
          </p>

          <div className="rounded-lg border px-3 py-3 text-sm" style={{ borderColor: 'var(--hair)', backgroundColor: 'var(--card2)', color: 'var(--ink-soft)' }}>
            El estado de avance de la obra se calcula automáticamente con hitos del Timeline, eventos de Agenda y la secuencia constructiva. No hace falta actualizar esta tarea manualmente.
          </div>

          <div className="flex gap-3 mt-6">
            <Button onClick={handleSaveTask} className="flex-1">
              Guardar
            </Button>
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
