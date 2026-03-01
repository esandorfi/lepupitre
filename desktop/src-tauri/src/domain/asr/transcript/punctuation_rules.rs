#[derive(Clone, Copy)]
pub(super) enum PunctInsert {
    Attach,
    Separate,
    Newline,
}

pub(super) struct SpokenRule {
    pub(super) phrase: &'static [&'static str],
    pub(super) replacement: &'static str,
    pub(super) mode: PunctInsert,
}

pub(super) fn spoken_rules(language: &str) -> &'static [SpokenRule] {
    match language {
        "fr" => FR_RULES,
        "en" => EN_RULES,
        _ => &[],
    }
}

const FR_RULES: &[SpokenRule] = &[
    SpokenRule {
        phrase: &["point", "d'interrogation"],
        replacement: "?",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["point", "d", "interrogation"],
        replacement: "?",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["point", "d'exclamation"],
        replacement: "!",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["point", "d", "exclamation"],
        replacement: "!",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["point", "virgule"],
        replacement: ";",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["deux", "points"],
        replacement: ":",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["retour", "a", "la", "ligne"],
        replacement: "\n",
        mode: PunctInsert::Newline,
    },
    SpokenRule {
        phrase: &["retour", "à", "la", "ligne"],
        replacement: "\n",
        mode: PunctInsert::Newline,
    },
    SpokenRule {
        phrase: &["ouvrir", "la", "parenthese"],
        replacement: "(",
        mode: PunctInsert::Separate,
    },
    SpokenRule {
        phrase: &["ouvrir", "la", "parenthèse"],
        replacement: "(",
        mode: PunctInsert::Separate,
    },
    SpokenRule {
        phrase: &["ouvrez", "la", "parenthese"],
        replacement: "(",
        mode: PunctInsert::Separate,
    },
    SpokenRule {
        phrase: &["ouvrez", "la", "parenthèse"],
        replacement: "(",
        mode: PunctInsert::Separate,
    },
    SpokenRule {
        phrase: &["fermer", "la", "parenthese"],
        replacement: ")",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["fermer", "la", "parenthèse"],
        replacement: ")",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["fermez", "la", "parenthese"],
        replacement: ")",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["fermez", "la", "parenthèse"],
        replacement: ")",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["virgule"],
        replacement: ",",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["point"],
        replacement: ".",
        mode: PunctInsert::Attach,
    },
];

const EN_RULES: &[SpokenRule] = &[
    SpokenRule {
        phrase: &["question", "mark"],
        replacement: "?",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["exclamation", "mark"],
        replacement: "!",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["full", "stop"],
        replacement: ".",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["new", "line"],
        replacement: "\n",
        mode: PunctInsert::Newline,
    },
    SpokenRule {
        phrase: &["open", "parenthesis"],
        replacement: "(",
        mode: PunctInsert::Separate,
    },
    SpokenRule {
        phrase: &["close", "parenthesis"],
        replacement: ")",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["comma"],
        replacement: ",",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["colon"],
        replacement: ":",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["semicolon"],
        replacement: ";",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["period"],
        replacement: ".",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["dot"],
        replacement: ".",
        mode: PunctInsert::Attach,
    },
];
