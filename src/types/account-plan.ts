export interface Stakeholder {
  jmeno?: string
  pozice?: string
  vztah?: string
}

export interface Riziko {
  popis: string
  doporuceni?: string
}

export interface Oportunita {
  nazev: string
  priorita?: string
}

export interface AccountPlan {
  nazevKlienta?: string
  accountOwner?: string
  obor?: string
  velikostFirmy?: string
  stavVztahu?: {
    celkovy?: string
    poOsobách?: Record<string, string>
  }
  stakeholderi?: {
    rozhodovaciUroven?: Stakeholder[]
    itKontakty?: Stakeholder[]
    ostatni?: Stakeholder[]
  }
  governance?: {
    steering?: string
    stav?: string
  }
  oblastiSpoluprace?: string
  rocniObjem?: string
  rozlozeniBudgetu?: string
  strategickaRizika?: Riziko[]
  oportunity?: Oportunita[]
  strategickeCile?: string[]
  klicoveAktivity?: string[]
  potrebaZasahuVedeni?: boolean
}
