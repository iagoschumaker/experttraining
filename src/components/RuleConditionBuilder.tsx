'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Code, Info, Move, ChevronDown, ChevronRight } from 'lucide-react'
import { ASSESSMENT_FIELDS } from '@/lib/assessment-constants'

interface RuleCondition {
  id: string
  field: string
  operator: string
  value: string | number
  logicalOperator?: 'AND' | 'OR'
}

interface ConditionGroup {
  id: string
  conditions: RuleCondition[]
  logicalOperator?: 'AND' | 'OR'
}

interface RuleConditionBuilderProps {
  conditions: RuleCondition[]
  onChange: (conditions: RuleCondition[]) => void
  className?: string
}

const OPERATORS = {
  number: [
    { value: '==', label: 'Igual a', description: 'Valor exatamente igual' },
    { value: '!=', label: 'Diferente de', description: 'Valor diferente' },
    { value: '>', label: 'Maior que', description: 'Valor maior que o especificado' },
    { value: '>=', label: 'Maior ou igual a', description: 'Valor maior ou igual ao especificado' },
    { value: '<', label: 'Menor que', description: 'Valor menor que o especificado' },
    { value: '<=', label: 'Menor ou igual a', description: 'Valor menor ou igual ao especificado' }
  ],
  select: [
    { value: '==', label: 'Igual a', description: 'Valor igual ao selecionado' },
    { value: '!=', label: 'Diferente de', description: 'Valor diferente do selecionado' }
  ],
  array: [
    { value: 'includes', label: 'Contém', description: 'Array contém o valor especificado' },
    { value: 'not_includes', label: 'Não contém', description: 'Array não contém o valor especificado' },
    { value: 'any_of', label: 'Qualquer um de', description: 'Array contém pelo menos um dos valores' },
    { value: 'none_of', label: 'Nenhum de', description: 'Array não contém nenhum dos valores' },
    { value: 'length_eq', label: 'Tamanho igual a', description: 'Array tem tamanho específico' },
    { value: 'length_gt', label: 'Tamanho maior que', description: 'Array tem tamanho maior que valor' }
  ],
  object: [
    { value: 'has_property', label: 'Tem propriedade', description: 'Objeto tem a propriedade especificada' },
    { value: 'property_equals', label: 'Propriedade igual a', description: 'Propriedade do objeto igual ao valor' },
    { value: 'property_gt', label: 'Propriedade maior que', description: 'Propriedade do objeto maior que valor' },
    { value: 'property_lt', label: 'Propriedade menor que', description: 'Propriedade do objeto menor que valor' }
  ]
}

const FIELD_EXAMPLES = {
  age: '25, 18, 45',
  gender: 'M, F',
  experienceLevel: 'beginner, intermediate, advanced',
  fitnessGoal: 'weight_loss, muscle_gain, endurance, strength',
  trainingFrequency: '3, 5, 7',
  preferredDuration: '30, 45, 60',
  bmi: '18.5, 25.0, 30.0',
  bodyFatPercentage: '15, 20, 25',
  vo2Max: '35, 45, 55',
  restingHeartRate: '60, 70, 80',
  maxHeartRate: '180, 190, 200',
  motivationLevel: '1-10'
}

export default function RuleConditionBuilder({ conditions, onChange, className = '' }: RuleConditionBuilderProps) {
  const [showHelp, setShowHelp] = useState(false)
  const [expandedConditions, setExpandedConditions] = useState<Set<string>>(new Set())

  const addCondition = () => {
    const newCondition: RuleCondition = {
      id: Date.now().toString(),
      field: '',
      operator: '',
      value: '',
      logicalOperator: conditions.length > 0 ? 'AND' : undefined
    }
    onChange([...conditions, newCondition])
  }

  const removeCondition = (id: string) => {
    onChange(conditions.filter(c => c.id !== id))
  }

  const updateCondition = (id: string, updates: Partial<RuleCondition>) => {
    onChange(conditions.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ))
  }

  const getFieldInfo = (fieldValue: string) => {
    return ASSESSMENT_FIELDS.find(f => f.value === fieldValue)
  }

  const getOperatorsForField = (fieldValue: string) => {
    const field = getFieldInfo(fieldValue)
    return OPERATORS[field?.type as keyof typeof OPERATORS] || []
  }

  const getFieldOptions = (fieldValue: string) => {
    const field = getFieldInfo(fieldValue)
    return field?.options || []
  }

  const renderValueInput = (condition: RuleCondition) => {
    const field = getFieldInfo(condition.field)
    const fieldOptions = getFieldOptions(condition.field)
    const example = FIELD_EXAMPLES[condition.field as keyof typeof FIELD_EXAMPLES]

    if (!field) return null

    // For select fields with predefined options
    if (fieldOptions.length > 0) {
      return (
        <Select
          value={condition.value.toString()}
          onValueChange={(value) => updateCondition(condition.id, { value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o valor" />
          </SelectTrigger>
          <SelectContent>
            {fieldOptions.map(option => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    // For array operations that expect multiple values
    if (field.type === 'array' && ['any_of', 'none_of'].includes(condition.operator)) {
      return (
        <Input
          placeholder="valor1,valor2,valor3"
          value={condition.value}
          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
        />
      )
    }

    // For object properties
    if (field.type === 'object') {
      if (['has_property'].includes(condition.operator)) {
        return (
          <Input
            placeholder="nomePropriedade"
            value={condition.value}
            onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
          />
        )
      }
      return (
        <Input
          placeholder="propriedade:valor"
          value={condition.value}
          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
        />
      )
    }

    // Default input for numbers and strings
    return (
      <Input
        type={field.type === 'number' ? 'number' : 'text'}
        placeholder={example || `Digite ${field.label.toLowerCase()}`}
        value={condition.value}
        onChange={(e) => updateCondition(condition.id, { 
          value: field.type === 'number' ? Number(e.target.value) || '' : e.target.value 
        })}
      />
    )
  }

  const toggleConditionExpansion = (id: string) => {
    const newExpanded = new Set(expandedConditions)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedConditions(newExpanded)
  }

  const validateCondition = (condition: RuleCondition): string[] => {
    const errors = []
    
    if (!condition.field) errors.push('Campo é obrigatório')
    if (!condition.operator) errors.push('Operador é obrigatório')
    if (condition.value === '' || condition.value === null || condition.value === undefined) {
      errors.push('Valor é obrigatório')
    }

    const field = getFieldInfo(condition.field)
    if (field) {
      // Validate number fields
      if (field.type === 'number' && isNaN(Number(condition.value))) {
        errors.push('Valor deve ser um número válido')
      }

      // Validate array operations
      if (field.type === 'array') {
        if (['any_of', 'none_of'].includes(condition.operator) && typeof condition.value === 'string') {
          const values = condition.value.split(',').map(v => v.trim())
          if (values.some(v => !v)) {
            errors.push('Todos os valores separados por vírgula devem ser válidos')
          }
        }
      }

      // Validate object operations
      if (field.type === 'object' && ['property_equals', 'property_gt', 'property_lt'].includes(condition.operator)) {
        if (typeof condition.value === 'string' && !condition.value.includes(':')) {
          errors.push('Formato deve ser propriedade:valor')
        }
      }
    }

    return errors
  }

  const getConditionPreview = (condition: RuleCondition): string => {
    const field = getFieldInfo(condition.field)
    const operator = getOperatorsForField(condition.field).find(op => op.value === condition.operator)
    
    if (!field || !operator) return 'Condição incompleta'

    return `${field.label} ${operator.label.toLowerCase()} ${condition.value}`
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5" />
          <h3 className="text-lg font-medium">Construtor de Condições</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowHelp(!showHelp)}
          >
            <Info className="w-4 h-4" />
          </Button>
          <Button onClick={addCondition} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Condição
          </Button>
        </div>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription className="space-y-2">
            <div>
              <strong>Como funciona:</strong> Crie condições que serão avaliadas durante o assessment. 
              Todas as condições devem ser verdadeiras (AND) ou pelo menos uma deve ser verdadeira (OR) para a regra ser ativada.
            </div>
            <div>
              <strong>Campos disponíveis:</strong> Idade, sexo, nível de experiência, objetivos, métricas corporais, etc.
            </div>
            <div>
              <strong>Operadores:</strong> Comparações numéricas, igualdade, operações em arrays e objetos.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Conditions */}
      {conditions.length === 0 ? (
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            Nenhuma condição definida. Adicione pelo menos uma condição para criar a regra.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {conditions.map((condition, index) => {
            const field = getFieldInfo(condition.field)
            const operator = getOperatorsForField(condition.field).find(op => op.value === condition.operator)
            const errors = validateCondition(condition)
            const isExpanded = expandedConditions.has(condition.id)
            const isValid = errors.length === 0 && condition.field && condition.operator && condition.value !== ''

            return (
              <Card key={condition.id} className={`transition-colors ${errors.length > 0 ? 'border-red-200 bg-red-50' : isValid ? 'border-green-200 bg-green-50' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Logical Operator */}
                      {index > 0 && (
                        <div className="flex items-center gap-2">
                          <Select
                            value={condition.logicalOperator || 'AND'}
                            onValueChange={(value) => updateCondition(condition.id, { logicalOperator: value as 'AND' | 'OR' })}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AND">E</SelectItem>
                              <SelectItem value="OR">OU</SelectItem>
                            </SelectContent>
                          </Select>
                          <Separator orientation="vertical" className="h-6" />
                        </div>
                      )}

                      {/* Condition Preview */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleConditionExpansion(condition.id)}
                          className="p-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                        <div className="text-sm">
                          {isValid ? (
                            <span className="text-gray-700">{getConditionPreview(condition)}</span>
                          ) : (
                            <span className="text-gray-400 italic">Configure a condição</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status and Actions */}
                    <div className="flex items-center gap-2">
                      {isValid && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Válida
                        </Badge>
                      )}
                      {errors.length > 0 && (
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          {errors.length} erro{errors.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      <Button
                        onClick={() => removeCondition(condition.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded Configuration */}
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Field Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Campo</Label>
                          <Select
                            value={condition.field}
                            onValueChange={(value) => updateCondition(condition.id, { 
                              field: value, 
                              operator: '', 
                              value: '' 
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o campo" />
                            </SelectTrigger>
                            <SelectContent className="max-h-48">
                              {ASSESSMENT_FIELDS.map(field => (
                                <SelectItem key={field.value} value={field.value}>
                                  <div>
                                    <div className="font-medium">{field.label}</div>
                                    <div className="text-xs text-gray-500">{field.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Operador</Label>
                          <Select
                            value={condition.operator}
                            onValueChange={(value) => updateCondition(condition.id, { operator: value })}
                            disabled={!condition.field}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Operador" />
                            </SelectTrigger>
                            <SelectContent>
                              {getOperatorsForField(condition.field).map(op => (
                                <SelectItem key={op.value} value={op.value}>
                                  <div>
                                    <div className="font-medium">{op.label}</div>
                                    <div className="text-xs text-gray-500">{op.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Valor</Label>
                          {renderValueInput(condition)}
                        </div>
                      </div>

                      {/* Field Help */}
                      {field && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
                          <div className="font-medium mb-1">{field.label} ({field.type})</div>
                          <div className="mb-2">{field.description}</div>
                          {FIELD_EXAMPLES[condition.field as keyof typeof FIELD_EXAMPLES] && (
                            <div>
                              <span className="font-medium">Exemplos: </span>
                              {FIELD_EXAMPLES[condition.field as keyof typeof FIELD_EXAMPLES]}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Errors */}
                      {errors.length > 0 && (
                        <div className="space-y-1">
                          {errors.map((error, errorIndex) => (
                            <Alert key={errorIndex} className="py-2">
                              <AlertDescription className="text-sm text-red-700">
                                {error}
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      )}

                      {/* Operator Help */}
                      {operator && (
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded-md">
                          <span className="font-medium">{operator.label}:</span> {operator.description}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Summary */}
      {conditions.length > 0 && (
        <Card className="bg-gray-50">
          <CardContent className="pt-4">
            <h4 className="font-medium mb-2">Resumo da Regra:</h4>
            <div className="text-sm text-gray-700">
              {conditions.map((condition, index) => {
                const preview = getConditionPreview(condition)
                return (
                  <span key={condition.id}>
                    {index > 0 && (
                      <span className="mx-2 font-medium text-blue-600">
                        {condition.logicalOperator || 'AND'}
                      </span>
                    )}
                    <span className={validateCondition(condition).length === 0 ? 'text-green-700' : 'text-red-700'}>
                      {preview}
                    </span>
                  </span>
                )
              })}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {conditions.filter(c => validateCondition(c).length === 0).length} de {conditions.length} condições válidas
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}