use rusqlite::Connection;

#[derive(Debug)]
pub struct TableColumn {
    pub name: String,
    pub notnull: bool,
}

pub fn table_info(conn: &Connection, table: &str) -> Result<Vec<TableColumn>, String> {
    let sql = format!("PRAGMA table_info('{table}')");
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("table_info_prepare: {e}"))?;
    let mut rows = stmt
        .query([])
        .map_err(|e| format!("table_info_query: {e}"))?;
    let mut columns = Vec::new();
    while let Some(row) = rows.next().map_err(|e| format!("table_info_row: {e}"))? {
        let name: String = row.get(1).map_err(|e| format!("table_info_name: {e}"))?;
        let notnull: i64 = row.get(3).map_err(|e| format!("table_info_notnull: {e}"))?;
        columns.push(TableColumn {
            name,
            notnull: notnull != 0,
        });
    }
    Ok(columns)
}

pub fn column_exists(conn: &Connection, table: &str, column: &str) -> Result<bool, String> {
    Ok(table_info(conn, table)?
        .iter()
        .any(|col| col.name == column))
}

pub fn column_notnull(
    conn: &Connection,
    table: &str,
    column: &str,
) -> Result<Option<bool>, String> {
    for col in table_info(conn, table)? {
        if col.name == column {
            return Ok(Some(col.notnull));
        }
    }
    Ok(None)
}
