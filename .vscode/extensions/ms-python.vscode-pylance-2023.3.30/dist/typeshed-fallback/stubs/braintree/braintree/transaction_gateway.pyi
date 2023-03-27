from _typeshed import Incomplete
from typing import Any

from braintree.error_result import ErrorResult as ErrorResult
from braintree.exceptions.not_found_error import NotFoundError as NotFoundError
from braintree.exceptions.request_timeout_error import RequestTimeoutError as RequestTimeoutError
from braintree.resource import Resource as Resource
from braintree.resource_collection import ResourceCollection as ResourceCollection
from braintree.successful_result import SuccessfulResult as SuccessfulResult
from braintree.transaction import Transaction as Transaction

class TransactionGateway:
    gateway: Any
    config: Any
    def __init__(self, gateway) -> None: ...
    def adjust_authorization(self, transaction_id, amount): ...
    def clone_transaction(self, transaction_id, params): ...
    def cancel_release(self, transaction_id): ...
    def create(self, params): ...
    def credit(self, params): ...
    def find(self, transaction_id): ...
    def hold_in_escrow(self, transaction_id): ...
    def refund(self, transaction_id, amount_or_options: Incomplete | None = ...): ...
    def sale(self, params): ...
    def search(self, *query): ...
    def release_from_escrow(self, transaction_id): ...
    def submit_for_settlement(self, transaction_id, amount: Incomplete | None = ..., params: Incomplete | None = ...): ...
    def update_details(self, transaction_id, params: Incomplete | None = ...): ...
    def submit_for_partial_settlement(self, transaction_id, amount, params: Incomplete | None = ...): ...
    def void(self, transaction_id): ...
