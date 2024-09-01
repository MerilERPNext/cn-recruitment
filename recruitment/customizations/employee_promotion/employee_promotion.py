import frappe


def on_submit(self,method):
    self.custom_status="Completed"