export type Rational = Readonly<{
  denominator: bigint
  display: string
  numerator: bigint
}>

type Operator = "+" | "-" | "*" | "/"

type NumberToken = Readonly<{
  kind: "number"
  value: Rational
}>

type OperatorToken = Readonly<{
  kind: "operator"
  value: Operator
}>

type Token = NumberToken | OperatorToken

export type ArithmeticEvaluationResult =
  | Readonly<{ kind: "ok"; value: Rational }>
  | Readonly<{ kind: "unsupported"; reason: string }>

export type NumericAnswerResult =
  | Readonly<{ kind: "ok"; unit: string; value: Rational }>
  | Readonly<{ kind: "unsupported"; reason: string }>

export type FinalSolutionValidationResult =
  | Readonly<{ kind: "verified"; method: "exact_rational_arithmetic"; notes: readonly string[] }>
  | Readonly<{ kind: "unverified"; method: "m5_validation_unavailable"; notes: readonly string[] }>
  | Readonly<{
      actual: string
      expected: string
      kind: "mismatch"
      method: "exact_rational_arithmetic"
      notes: readonly string[]
    }>

export type FinalSolutionValidationInput = Readonly<{
  answer: string
  steps: readonly Readonly<{ expression: string }>[]
}>

export type SimilarProblemValidationInput = Readonly<{
  answer: string
  candidateProblemText: string
  originalProblemText: string
  solutionSteps: readonly string[]
}>

export type SimilarProblemValidationResult =
  | Readonly<{ kind: "verified"; method: "exact_rational_arithmetic"; notes: readonly string[] }>
  | Readonly<{ kind: "duplicate_source"; notes: readonly string[] }>
  | Readonly<{ kind: "unsupported_validation"; notes: readonly string[] }>
  | Readonly<{
      actual: string
      expected: string
      kind: "mismatch"
      method: "exact_rational_arithmetic"
      notes: readonly string[]
    }>

const ZERO = 0n
const ONE = 1n
const TEN = 10n

const absolute = (value: bigint): bigint => (value < ZERO ? -value : value)

const greatestCommonDivisor = (left: bigint, right: bigint): bigint => {
  let a = absolute(left)
  let b = absolute(right)

  while (b !== ZERO) {
    const next = a % b
    a = b
    b = next
  }

  return a === ZERO ? ONE : a
}

const createRational = (numerator: bigint, denominator: bigint): Rational | null => {
  if (denominator === ZERO) {
    return null
  }

  const sign = denominator < ZERO ? -ONE : ONE
  const normalizedNumerator = numerator * sign
  const normalizedDenominator = denominator * sign
  const divisor = greatestCommonDivisor(normalizedNumerator, normalizedDenominator)
  const reducedNumerator = normalizedNumerator / divisor
  const reducedDenominator = normalizedDenominator / divisor
  const display =
    reducedDenominator === ONE
      ? reducedNumerator.toString()
      : `${reducedNumerator.toString()}/${reducedDenominator.toString()}`

  return {
    denominator: reducedDenominator,
    display,
    numerator: reducedNumerator,
  }
}

const add = (left: Rational, right: Rational): Rational =>
  createRational(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  ) ?? left

const subtract = (left: Rational, right: Rational): Rational =>
  createRational(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator,
  ) ?? left

const multiply = (left: Rational, right: Rational): Rational =>
  createRational(left.numerator * right.numerator, left.denominator * right.denominator) ?? left

const divide = (left: Rational, right: Rational): Rational | null =>
  createRational(left.numerator * right.denominator, left.denominator * right.numerator)

const areEqual = (left: Rational, right: Rational): boolean =>
  left.numerator === right.numerator && left.denominator === right.denominator

const parseUnsignedNumber = (source: string): Rational | null => {
  if (/^\d+$/.test(source)) {
    return createRational(BigInt(source), ONE)
  }

  if (/^\d+\.\d+$/.test(source)) {
    const [wholePart, fractionalPart] = source.split(".")
    if (wholePart === undefined || fractionalPart === undefined) {
      return null
    }
    const scale = TEN ** BigInt(fractionalPart.length)
    return createRational(BigInt(`${wholePart}${fractionalPart}`), scale)
  }

  if (/^\d+\/\d+$/.test(source)) {
    const [numerator, denominator] = source.split("/")
    if (numerator === undefined || denominator === undefined) {
      return null
    }
    return createRational(BigInt(numerator), BigInt(denominator))
  }

  return null
}

const parseSignedNumber = (source: string): Rational | null => {
  const sign = source.startsWith("-") ? -ONE : ONE
  const unsigned = source.startsWith("-") ? source.slice(1) : source
  const parsed = parseUnsignedNumber(unsigned)
  if (parsed === null) {
    return null
  }
  return createRational(parsed.numerator * sign, parsed.denominator)
}

const normalizeOperator = (value: string): Operator | null => {
  if (value === "+" || value === "-") {
    return value
  }
  if (value === "*" || value === "×" || value === "x") {
    return "*"
  }
  if (value === "/" || value === "÷") {
    return "/"
  }
  return null
}

const readNumberToken = (
  expression: string,
  start: number,
  allowSign: boolean,
): Readonly<{ nextIndex: number; token: NumberToken }> | null => {
  let index = start
  const sign = expression[index] === "-" && allowSign ? "-" : ""
  if (sign !== "") {
    index += 1
  }

  let whole = ""
  while (index < expression.length && /\d/.test(expression[index] ?? "")) {
    const digit = expression[index]
    if (digit === undefined) {
      return null
    }
    whole += digit
    index += 1
  }

  let decimal = ""
  if (expression[index] === ".") {
    decimal += "."
    index += 1
    while (index < expression.length && /\d/.test(expression[index] ?? "")) {
      const digit = expression[index]
      if (digit === undefined) {
        return null
      }
      decimal += digit
      index += 1
    }
  }

  if (whole === "" || decimal === ".") {
    return null
  }

  let rawNumber = `${sign}${whole}${decimal}`
  if (expression[index] === "/" && /\d/.test(expression[index + 1] ?? "") && decimal === "") {
    index += 1
    let denominator = ""
    while (index < expression.length && /\d/.test(expression[index] ?? "")) {
      const digit = expression[index]
      if (digit === undefined) {
        return null
      }
      denominator += digit
      index += 1
    }
    rawNumber = `${rawNumber}/${denominator}`
  }

  const value = parseSignedNumber(rawNumber)
  if (value === null) {
    return null
  }

  return { nextIndex: index, token: { kind: "number", value } }
}

const tokenize = (expression: string): readonly Token[] | null => {
  const tokens: Token[] = []
  let index = 0
  let expectsNumber = true

  while (index < expression.length) {
    const char = expression[index] ?? ""
    if (/\s/.test(char)) {
      index += 1
      continue
    }

    const numberToken = readNumberToken(expression, index, expectsNumber)
    if (numberToken !== null) {
      tokens.push(numberToken.token)
      index = numberToken.nextIndex
      expectsNumber = false
      continue
    }

    if (!expectsNumber) {
      const operator = normalizeOperator(char)
      if (operator !== null) {
        tokens.push({ kind: "operator", value: operator })
        index += 1
        expectsNumber = true
        continue
      }
    }

    return null
  }

  if (tokens.length === 0 || expectsNumber) {
    return null
  }
  return tokens
}

const applyOperator = (left: Rational, operator: Operator, right: Rational): Rational | null => {
  if (operator === "+") {
    return add(left, right)
  }
  if (operator === "-") {
    return subtract(left, right)
  }
  if (operator === "*") {
    return multiply(left, right)
  }
  return divide(left, right)
}

const collapsePrecedence = (tokens: readonly Token[]): readonly Token[] | null => {
  const collapsed: Token[] = []
  let index = 0

  while (index < tokens.length) {
    const current = tokens[index]
    if (current === undefined) {
      return null
    }
    if (current.kind === "operator") {
      return null
    }

    let value = current.value
    index += 1

    while (index < tokens.length) {
      const operatorToken = tokens[index]
      const rightToken = tokens[index + 1]
      if (operatorToken === undefined || rightToken === undefined) {
        return null
      }
      if (operatorToken.kind !== "operator" || rightToken.kind !== "number") {
        return null
      }
      if (operatorToken.value !== "*" && operatorToken.value !== "/") {
        break
      }
      const nextValue = applyOperator(value, operatorToken.value, rightToken.value)
      if (nextValue === null) {
        return null
      }
      value = nextValue
      index += 2
    }

    collapsed.push({ kind: "number", value })
    if (index < tokens.length) {
      const lowPrecedenceOperator = tokens[index]
      if (
        lowPrecedenceOperator?.kind !== "operator" ||
        (lowPrecedenceOperator.value !== "+" && lowPrecedenceOperator.value !== "-")
      ) {
        return null
      }
      collapsed.push(lowPrecedenceOperator)
      index += 1
    }
  }

  return collapsed
}

export const evaluateArithmeticExpression = (expression: string): ArithmeticEvaluationResult => {
  const tokens = tokenize(expression)
  if (tokens === null) {
    return { kind: "unsupported", reason: "expression must contain only supported arithmetic" }
  }

  const collapsed = collapsePrecedence(tokens)
  if (collapsed === null) {
    return { kind: "unsupported", reason: "expression structure is not supported" }
  }

  const first = collapsed[0]
  if (first?.kind !== "number") {
    return { kind: "unsupported", reason: "expression must start with a number" }
  }

  let value = first.value
  let index = 1
  while (index < collapsed.length) {
    const operatorToken = collapsed[index]
    const rightToken = collapsed[index + 1]
    if (
      operatorToken === undefined ||
      rightToken === undefined ||
      operatorToken.kind !== "operator" ||
      rightToken.kind !== "number"
    ) {
      return { kind: "unsupported", reason: "expression structure is not supported" }
    }
    const nextValue = applyOperator(value, operatorToken.value, rightToken.value)
    if (nextValue === null) {
      return { kind: "unsupported", reason: "division by zero is not supported" }
    }
    value = nextValue
    index += 2
  }

  return { kind: "ok", value }
}

export const extractNumericAnswer = (answer: string): NumericAnswerResult => {
  const trimmed = answer.trim()
  const match = /^(-?\d+(?:\.\d+)?(?:\/\d+)?)\s*(.*)$/u.exec(trimmed)
  if (match === null) {
    return { kind: "unsupported", reason: "answer must start with a supported number" }
  }

  const numericPart = match[1]
  const unit = match[2]
  if (numericPart === undefined || unit === undefined) {
    return { kind: "unsupported", reason: "answer number could not be extracted" }
  }

  const value = parseSignedNumber(numericPart)
  if (value === null) {
    return { kind: "unsupported", reason: "answer number is not supported" }
  }

  return { kind: "ok", unit: unit.trim(), value }
}

export const validateFinalSolutionArithmetic = (
  input: FinalSolutionValidationInput,
): FinalSolutionValidationResult => {
  const answer = extractNumericAnswer(input.answer)
  if (answer.kind !== "ok") {
    return {
      kind: "unverified",
      method: "m5_validation_unavailable",
      notes: ["최종 답에서 검산 가능한 숫자를 찾지 못했어요."],
    }
  }

  const evaluatedSteps = input.steps
    .map((step) => evaluateArithmeticExpression(step.expression))
    .filter((result): result is Readonly<{ kind: "ok"; value: Rational }> => result.kind === "ok")

  if (evaluatedSteps.length === 0) {
    return {
      kind: "unverified",
      method: "m5_validation_unavailable",
      notes: ["최종 풀이에서 검산 가능한 산술식을 찾지 못했어요."],
    }
  }

  const mismatchedStep = evaluatedSteps.find((step) => !areEqual(step.value, answer.value))
  if (mismatchedStep !== undefined) {
    return {
      actual: answer.value.display,
      expected: mismatchedStep.value.display,
      kind: "mismatch",
      method: "exact_rational_arithmetic",
      notes: ["최종 답과 풀이식 계산 결과가 일치하지 않아요."],
    }
  }

  const unitNote =
    answer.unit === ""
      ? "최종 답 숫자를 정확한 유리수 계산으로 확인했어요."
      : `최종 풀이식과 답의 숫자를 확인했어요. 단위 표기: ${answer.unit}`

  return {
    kind: "verified",
    method: "exact_rational_arithmetic",
    notes: ["최종 풀이식을 정확한 유리수 계산으로 확인했어요.", unitNote],
  }
}

const normalizeProblemText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/\s+/gu, "")
    .replace(/[.,!?;:'"“”‘’()[\]{}·]/gu, "")

const removeNumericFragments = (text: string): string =>
  text.replace(/\d+(?:\.\d+)?(?:\/\d+)?/gu, "")

const createTokenSet = (text: string): ReadonlySet<string> => {
  const tokens = text.match(/[가-힣A-Za-z]+|\d+(?:\.\d+)?(?:\/\d+)?/gu)
  return new Set(tokens ?? [])
}

const calculateJaccardSimilarity = (
  leftTokens: ReadonlySet<string>,
  rightTokens: ReadonlySet<string>,
): number => {
  if (leftTokens.size === 0 && rightTokens.size === 0) {
    return 1
  }

  let intersectionSize = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersectionSize += 1
    }
  }
  const unionSize = new Set([...leftTokens, ...rightTokens]).size
  return unionSize === 0 ? 0 : intersectionSize / unionSize
}

const isDuplicateSourceProblem = (originalProblemText: string, candidateProblemText: string) => {
  const normalizedOriginal = normalizeProblemText(originalProblemText)
  const normalizedCandidate = normalizeProblemText(candidateProblemText)

  if (normalizedOriginal === normalizedCandidate) {
    return true
  }
  if (
    normalizedOriginal !== "" &&
    normalizedCandidate !== "" &&
    (normalizedOriginal.includes(normalizedCandidate) ||
      normalizedCandidate.includes(normalizedOriginal))
  ) {
    return true
  }

  const originalWithoutNumbers = removeNumericFragments(normalizedOriginal)
  const candidateWithoutNumbers = removeNumericFragments(normalizedCandidate)
  if (
    originalWithoutNumbers !== "" &&
    originalWithoutNumbers === candidateWithoutNumbers &&
    normalizedOriginal !== normalizedCandidate
  ) {
    return true
  }

  const similarity = calculateJaccardSimilarity(
    createTokenSet(originalWithoutNumbers),
    createTokenSet(candidateWithoutNumbers),
  )
  return similarity >= 0.9
}

export const validateSimilarProblemCandidate = (
  input: SimilarProblemValidationInput,
): SimilarProblemValidationResult => {
  if (isDuplicateSourceProblem(input.originalProblemText, input.candidateProblemText)) {
    return {
      kind: "duplicate_source",
      notes: ["비슷한 문제가 원문과 너무 비슷해요."],
    }
  }

  const validation = validateFinalSolutionArithmetic({
    answer: input.answer,
    steps: input.solutionSteps.map((expression) => ({ expression })),
  })

  if (validation.kind === "verified") {
    return {
      kind: "verified",
      method: validation.method,
      notes: ["비슷한 문제 풀이식을 정확한 유리수 계산으로 확인했어요.", ...validation.notes],
    }
  }

  if (validation.kind === "mismatch") {
    return {
      actual: validation.actual,
      expected: validation.expected,
      kind: "mismatch",
      method: validation.method,
      notes: ["비슷한 문제의 답과 풀이식 계산 결과가 일치하지 않아요."],
    }
  }

  return {
    kind: "unsupported_validation",
    notes: ["비슷한 문제에서 검산 가능한 산술식을 찾지 못했어요."],
  }
}
