package com.arnold.mobileLib.util

//Resource - a sealed class that wraps every API responses
//Has three states:-
//Loading - means request is in progress
//Success - means request succeeded with the data
//Error - Request failed with a message.

//ViewModel observes the resource and the ui reacts accordingly

sealed class Resource<T> {
    class Loading<T>: Resource<T>()
    data class Success<T>(val data : T): Resource<T>()
    data class Error<T>(val message : String): Resource<T>()
}