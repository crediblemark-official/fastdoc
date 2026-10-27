"""
FastDoc Database Package
"""
from engine.db.database import (
    init_db,
    seed_initial_demo_data,
    get_all_workspaces,
    get_workspace_by_id,
    create_workspace,
    delete_workspace,
    get_master_entities,
    upsert_master_entity,
    add_record_to_workspace,
    update_workspace_record,
    delete_workspace_record,
    get_db_connection
)

__all__ = [
    "init_db",
    "seed_initial_demo_data",
    "get_all_workspaces",
    "get_workspace_by_id",
    "create_workspace",
    "delete_workspace",
    "get_master_entities",
    "upsert_master_entity",
    "add_record_to_workspace",
    "update_workspace_record",
    "delete_workspace_record",
    "get_db_connection"
]
